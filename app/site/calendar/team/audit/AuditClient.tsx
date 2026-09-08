'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { ShieldCheck, UserCog, CalendarDays, DoorOpen, Link2, CreditCard, ArrowRightLeft, Plus, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, type AuditEntry, type Delegation, memberName, byId, logTeamAction } from '@/lib/calendar/team'
import { fmtDate as fmtDateTz, fmtDateTime as fmtDateTimeTz } from '@/lib/calendar/fmt'

const SCOPE_META: Record<AuditEntry['scope'], { icon: typeof ShieldCheck; label: string }> = {
  calendar:   { icon: CalendarDays, label: 'Calendar' },
  member:     { icon: UserCog, label: 'Members' },
  resource:   { icon: DoorOpen, label: 'Resources' },
  booking:    { icon: Link2, label: 'Booking' },
  billing:    { icon: CreditCard, label: 'Billing' },
  delegation: { icon: ArrowRightLeft, label: 'Delegation' },
}
// Unknown scopes (bad rows, future values) must not crash the log — fall back.
const scopeMeta = (s: string) => SCOPE_META[s as AuditEntry['scope']] ?? { icon: ShieldCheck, label: s || 'Other' }

export default function AuditClient({ ws }: { ws: TeamWorkspace }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [delegations, setDelegations] = useState<Delegation[]>(ws.delegations)
  const [scope, setScope] = useState<AuditEntry['scope'] | 'all'>('all')

  const revoke = (id: string) => {
    setDelegations((ds) => ds.filter((d) => d.id !== id))
    if (ws.live) supabase.from('team_delegations').delete().eq('id', id).then(({ error }: any) => { if (error) toast.error(error.message) })
  }
  const scopes: (AuditEntry['scope'] | 'all')[] = ['all', 'calendar', 'member', 'resource', 'booking', 'billing', 'delegation']
  const log = ws.audit.filter((a) => scope === 'all' || a.scope === scope)

  const [form, setForm] = useState<{ granteeId: string; scope: string } | null>(null)
  const others = ws.members.filter((m) => m.status === 'active' && m.id !== ws.currentMemberId)

  const exportCsv = () => {
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['when', 'actor', 'action', 'target', 'scope'],
      ...log.map((a) => [a.at, memberName(ws.members, a.actor_id), a.action, a.target, a.scope]),
    ]
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'audit-log.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const delegate = async () => {
    if (!form) return
    const grantee = byId(ws.members, form.granteeId)
    if (!grantee) { toast.error('Pick who acts on your behalf.'); return }
    const scopeText = form.scope.trim() || 'Full calendar access'
    const since = new Intl.DateTimeFormat('en-CA', { timeZone: ws.team.timezone }).format(new Date())
    const grantorName = memberName(ws.members, ws.currentMemberId)
    if (ws.live) {
      const { data, error } = await supabase.from('team_delegations')
        .insert({ team_id: ws.team.id, grantor_id: ws.currentMemberId, grantee_id: grantee.id, scope: scopeText, since })
        .select('id').single()
      if (error || !data) { toast.error(error?.message ?? 'Could not delegate'); return }
      setDelegations((ds) => [...ds, { id: data.id, grantor_id: ws.currentMemberId, grantee_id: grantee.id, scope: scopeText, since }])
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'delegated calendar', `${grantee.name} acts for ${grantorName}`, 'delegation')
      toast.success('Delegation added')
    } else {
      setDelegations((ds) => [...ds, { id: `d-${Date.now()}`, grantor_id: ws.currentMemberId, grantee_id: grantee.id, scope: scopeText, since }])
    }
    setForm(null)
  }

  return (
    <TeamShell workspace={ws} title="Delegation & audit"
      subtitle="Let trusted teammates act on your behalf — and keep a complete, exportable trail of every action."
      actions={<button onClick={exportCsv} className="btn-outline px-3.5 py-2 text-sm">Export CSV</button>}>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Delegations */}
        <SectionCard title="Active delegations"
          action={<button onClick={() => setForm({ granteeId: others[0]?.id ?? '', scope: 'Full calendar access' })} className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--gold-dark)' }}><Plus size={13} /> Delegate</button>}>
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
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{d.scope} · since {fmtDateTz(d.since, ws.team.timezone)}</p>
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
              const M = scopeMeta(a.scope)
              return (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                    <M.icon size={13} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}><strong>{memberName(ws.members, a.actor_id)}</strong> {a.action}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{a.target} · {fmtDateTimeTz(a.at, ws.team.timezone)}</p>
                  </div>
                </li>
              )
            })}
            {log.length === 0 && <li className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No entries for this filter.</li>}
          </ol>
        </SectionCard>
      </div>

      {/* Delegate dialog */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setForm(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-md sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>New delegation</h2>
              <button onClick={() => setForm(null)} className="btn-ghost" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{memberName(ws.members, ws.currentMemberId)}</strong> grants access to:
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Acts on your behalf</label>
                <select value={form.granteeId} onChange={(e) => setForm({ ...form, granteeId: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  {others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Scope</label>
                <input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  placeholder="Full calendar access" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={delegate} className="btn-primary flex-1 justify-center py-2 text-sm"><Check size={15} /> Delegate</button>
                <button onClick={() => setForm(null)} className="btn-outline justify-center py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeamShell>
  )
}
