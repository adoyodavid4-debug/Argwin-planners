'use client'
import { useState } from 'react'
import { Plus, Eye, EyeOff, Users, Calendar as CalIcon } from 'lucide-react'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, type SharedCalendar, TEAM_COLOURS, byId } from '@/lib/calendar/team'

export default function CalendarsClient({ ws }: { ws: TeamWorkspace }) {
  const [cals, setCals] = useState<SharedCalendar[]>(ws.calendars)
  const [selected, setSelected] = useState<string>(ws.calendars[0]?.id ?? '')

  const toggleVisibility = (id: string) =>
    setCals((cs) => cs.map((c) => (c.id === id ? { ...c, visibility: c.visibility === 'full' ? 'busy' : 'full' } : c)))

  const active = byId(cals, selected)

  return (
    <TeamShell workspace={ws} currentRole="owner" title="Shared calendars"
      subtitle="Calendars the whole team can see. Choose how much detail each one reveals."
      actions={<button className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New calendar</button>}>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* List */}
        <div className="space-y-2 lg:col-span-1">
          {cals.map((c) => {
            const on = c.id === selected
            const col = TEAM_COLOURS[c.colour] ?? TEAM_COLOURS.brass
            return (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className="flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
                style={{ borderColor: on ? 'rgba(var(--gold-rgb),0.5)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.06)' : 'var(--bg-card)' }}>
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: col.dot }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.member_ids.length} members · {c.events_week} events/wk</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {c.visibility === 'full' ? <Eye size={13} /> : <EyeOff size={13} />}
                </span>
              </button>
            )
          })}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {active && (
            <SectionCard title={active.name}
              action={
                <button onClick={() => toggleVisibility(active.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {active.visibility === 'full' ? <><Eye size={13} /> Full details</> : <><EyeOff size={13} /> Busy only</>}
                </button>
              }>
              <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{active.description}</p>

              <div className="mb-5 grid grid-cols-3 gap-3">
                <MiniStat icon={CalIcon} label="Events / week" value={active.events_week} />
                <MiniStat icon={Users} label="Members" value={active.member_ids.length} />
                <MiniStat icon={active.visibility === 'full' ? Eye : EyeOff} label="Sharing" value={active.visibility === 'full' ? 'Full' : 'Busy'} />
              </div>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Shared with</p>
              <div className="flex flex-wrap gap-2">
                {active.member_ids.map((id) => {
                  const m = byId(ws.members, id)
                  if (!m) return null
                  return (
                    <span key={id} className="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3" style={{ borderColor: 'var(--border)' }}>
                      <Avatar name={m.name} hue={m.hue} size={22} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                    </span>
                  )
                })}
              </div>

              <div className="mt-5 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {active.visibility === 'full'
                  ? 'Members see event titles, locations and attendees on this calendar.'
                  : 'Members see only busy/free blocks — titles and details stay private.'}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </TeamShell>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
      <Icon size={15} style={{ color: 'var(--gold)' }} />
      <p className="mt-1.5 font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}
