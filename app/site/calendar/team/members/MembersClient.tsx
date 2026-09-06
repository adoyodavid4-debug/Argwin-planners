'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, Check, Mail, X, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, type Member, type Role, ROLES, ROLE_ORDER, fmtOffset, byId, logTeamAction } from '@/lib/calendar/team'

export default function MembersClient({ ws }: { ws: TeamWorkspace }) {
  const [members, setMembers] = useState<Member[]>(ws.members)
  const [invite, setInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('propose')

  const supabase = useMemo(() => createClient() as any, [])

  const setRole = (id: string, role: Role) => {
    const prev = byId(members, id)?.name ?? 'Member'
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, role } : m)))
    if (ws.live) {
      supabase.from('team_members').update({ role }).eq('id', id).then(({ error }: any) => { if (error) toast.error(error.message) })
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'changed role', `${prev} → ${ROLES[role].label}`, 'member')
    }
  }
  const remove = (id: string) => {
    setMembers((ms) => ms.filter((m) => m.id !== id))
    if (ws.live) supabase.from('team_members').delete().eq('id', id).then(({ error }: any) => { if (error) toast.error(error.message) })
  }

  const sendInvite = async () => {
    const email = inviteEmail.trim()
    if (!email) return
    const name = email.split('@')[0]
    if (ws.live) {
      const { data, error } = await supabase.from('team_members')
        .insert({ team_id: ws.team.id, email, name, role: inviteRole, status: 'invited', timezone: ws.team.timezone, tz_offset: -5, hue: (members.length * 47) % 360 })
        .select('id').single()
      if (error || !data) { toast.error(error?.message ?? 'Could not send invite'); return }
      setMembers((ms) => [...ms, { id: data.id, name, email, role: inviteRole, title: 'Invited', timezone: ws.team.timezone, tz_offset: -5, hue: (ms.length * 47) % 360, status: 'invited', last_active: 'pending', meetings_week: 0, focus_hours: 0 }])
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'invited member', email, 'member')
      toast.success('Invite sent')
    } else {
      setMembers((ms) => [...ms, { id: `inv-${Date.now()}`, name, email, role: inviteRole, title: 'Invited', timezone: ws.team.timezone, tz_offset: -5, hue: (ms.length * 47) % 360, status: 'invited', last_active: 'pending', meetings_week: 0, focus_hours: 0 }])
    }
    setInviteEmail(''); setInvite(false)
  }

  const active = members.filter((m) => m.status === 'active')
  const invited = members.filter((m) => m.status === 'invited')

  return (
    <TeamShell workspace={ws} title="Members & roles"
      subtitle="Invite people and set exactly what each person can do."
      actions={<button onClick={() => setInvite((v) => !v)} className="btn-primary px-3.5 py-2 text-sm"><UserPlus size={15} /> Invite</button>}>

      {invite && (
        <div className="mb-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'var(--bg-card)' }}>
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Invite a teammate</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', minWidth: 220 }}>
              <Mail size={15} style={{ color: 'var(--text-muted)' }} />
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com"
                className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}
              className="rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
              {ROLE_ORDER.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
            <button onClick={sendInvite} className="btn-primary px-4 py-2 text-sm">Send invite</button>
            <button onClick={() => setInvite(false)} className="btn-ghost" aria-label="Close"><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roster */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={`Active · ${active.length}`}>
            <div className="space-y-2">
              {active.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--border)' }}>
                  <Avatar name={m.name} hue={m.hue} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{m.email} · {m.title} · {fmtOffset(m.tz_offset)}</p>
                  </div>
                  <select value={m.role} onChange={(e) => setRole(m.id, e.target.value as Role)} disabled={m.role === 'owner'}
                    className="rounded-lg border px-2.5 py-1.5 text-xs outline-none disabled:opacity-60"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
                  </select>
                  {m.role !== 'owner' && (
                    <button onClick={() => remove(m.id)} className="btn-ghost" aria-label="Remove"><X size={15} /></button>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {invited.length > 0 && (
            <SectionCard title={`Pending invites · ${invited.length}`}>
              <div className="space-y-2">
                {invited.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--border)', opacity: 0.85 }}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--border)' }}><Clock size={15} style={{ color: 'var(--text-muted)' }} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.email}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Invited as {ROLES[m.role].label} · awaiting acceptance</p>
                    </div>
                    <button onClick={() => remove(m.id)} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Revoke</button>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Permission matrix */}
        <SectionCard title="What each role can do">
          <div className="space-y-4">
            {ROLE_ORDER.map((r) => {
              const def = ROLES[r]
              return (
                <div key={r}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>{def.label}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{def.blurb}</span>
                  </div>
                  <ul className="ml-1 space-y-1">
                    {def.can.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>
    </TeamShell>
  )
}
