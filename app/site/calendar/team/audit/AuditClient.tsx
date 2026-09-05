'use client'
import { useState } from 'react'
import { ShieldCheck, UserCog, CalendarDays, DoorOpen, Link2, CreditCard, ArrowRightLeft, Plus } from 'lucide-react'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, type AuditEntry, type Delegation, memberName, byId } from '@/lib/calendar/team'

const SCOPE_META: Record<AuditEntry['scope'], { icon: typeof ShieldCheck; label: string }> = {
  calendar:   { icon: CalendarDays, label: 'Calendar' },
  member:     { icon: UserCog, label: 'Members' },
  resource:   { icon: DoorOpen, label: 'Resources' },
  booking:    { icon: Link2, label: 'Booking' },
  billing:    { icon: CreditCard, label: 'Billing' },
  delegation: { icon: ArrowRightLeft, label: 'Delegation' },
}
const fmtDateTime = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

export default function AuditClient({ ws }: { ws: TeamWorkspace }) {
  const [delegations, setDelegations] = useState<Delegation[]>(ws.delegations)
  const [scope, setScope] = useState<AuditEntry['scope'] | 'all'>('all')

  const revoke = (id: string) => setDelegations((ds) => ds.filter((d) => d.id !== id))
  const scopes: (AuditEntry['scope'] | 'all')[] = ['all', 'calendar', 'member', 'resource', 'booking', 'billing', 'delegation']
  const log = ws.audit.filter((a) => scope === 'all' || a.scope === scope)

  return (
    <TeamShell workspace={ws} currentRole="owner" title="Delegation & audit"
      subtitle="Let trusted teammates act on your behalf — and keep a complete, exportable trail of every action."
      actions={<button className="btn-outline px-3.5 py-2 text-sm">Export CSV</button>}>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Delegations */}
        <SectionCard title="Active delegations"
          action={<button className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--gold-dark)' }}><Plus size={13} /> Delegate</button>}>
          {delegations.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No active delegations.</p>
          ) : (
            <div className="space-y-2">
              {delegations.map((d) => {
                const grantor = byId(ws.members, d.grantor_id)
                const grantee = byId(ws.members, d.grantee_id)
                return (
                  <div key={d.id} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      {grantee && <Avatar name={grantee.name} hue={grantee.hue} size={26} />}
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        <strong>{grantee?.name}</strong> acts for <strong>{grantor?.name}</strong>
                      </p>
                      <button onClick={() => revoke(d.id)} className="ml-auto text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Revoke</button>
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{d.scope} · since {fmtDate(d.since)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* Audit log */}
        <SectionCard title="Audit log">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {scopes.map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className="rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize"
                style={scope === s ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {s === 'all' ? 'All' : SCOPE_META[s as AuditEntry['scope']].label}
              </button>
            ))}
          </div>
          <ol className="space-y-2.5">
            {log.map((a) => {
              const M = SCOPE_META[a.scope]
              return (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                    <M.icon size={13} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}><strong>{memberName(ws.members, a.actor_id)}</strong> {a.action}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{a.target} · {fmtDateTime(a.at)}</p>
                  </div>
                </li>
              )
            })}
            {log.length === 0 && <li className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No entries for this filter.</li>}
          </ol>
        </SectionCard>
      </div>
    </TeamShell>
  )
}
