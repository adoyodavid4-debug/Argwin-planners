'use client'
import { useMemo } from 'react'
import { BarChart3, Clock, Moon, Users } from 'lucide-react'
import TeamShell, { StatCard, SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, TEAM_COLOURS } from '@/lib/calendar/team'

export default function AnalyticsClient({ ws }: { ws: TeamWorkspace }) {
  const active = useMemo(() => ws.members.filter((m) => m.status === 'active'), [ws.members])

  const totalMeetings = active.reduce((s, m) => s + m.meetings_week, 0)
  const totalFocus = active.reduce((s, m) => s + m.focus_hours, 0)
  const avgMeetings = active.length ? Math.round(totalMeetings / active.length) : 0
  const focusRatio = totalMeetings + totalFocus > 0 ? Math.round((totalFocus / (totalFocus + totalMeetings * 0.75)) * 100) : 0
  const maxMeetings = Math.max(1, ...active.map((m) => m.meetings_week))
  const overloaded = active.filter((m) => m.meetings_week >= 20)

  return (
    <TeamShell workspace={ws} currentRole="owner" title="Team analytics"
      subtitle="Where the team’s time actually goes — meeting load, focus and after-hours creep."
      actions={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>This week</span>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Meetings / week" value={totalMeetings} hint={`avg ${avgMeetings} per person`} />
        <StatCard label="Focus hours" value={`${totalFocus}h`} hint="protected this week" />
        <StatCard label="Focus ratio" value={`${focusRatio}%`} hint="focus vs. meetings" />
        <StatCard label="Overloaded" value={overloaded.length} hint="20+ meetings/wk" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Meeting load bars */}
        <div className="lg:col-span-2">
          <SectionCard title="Meeting load by person"
            action={<span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><BarChart3 size={13} /> meetings this week</span>}>
            <div className="space-y-3">
              {[...active].sort((a, b) => b.meetings_week - a.meetings_week).map((m) => {
                const pct = (m.meetings_week / maxMeetings) * 100
                const heavy = m.meetings_week >= 20
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.name} hue={m.hue} size={26} />
                    <span className="w-28 flex-shrink-0 truncate text-sm" style={{ color: 'var(--text-secondary)' }}>{m.name.split(' ')[0]}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: heavy ? '#B4664A' : 'var(--gold)' }} />
                    </div>
                    <span className="w-10 flex-shrink-0 text-right text-xs font-medium" style={{ color: heavy ? '#B4664A' : 'var(--text-primary)' }}>{m.meetings_week}</span>
                  </div>
                )
              })}
            </div>
            {overloaded.length > 0 && (
              <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: 'rgba(180,102,74,0.4)', background: 'rgba(180,102,74,0.08)', color: '#8a4a34' }}>
                <strong>{overloaded.map((m) => m.name.split(' ')[0]).join(', ')}</strong> {overloaded.length > 1 ? 'are' : 'is'} carrying a heavy meeting load. Rescue mode can suggest what to decline, shorten or delegate.
              </div>
            )}
          </SectionCard>
        </div>

        {/* Busiest calendars + focus */}
        <div className="space-y-6">
          <SectionCard title="Busiest calendars">
            <div className="space-y-2.5">
              {[...ws.calendars].sort((a, b) => b.events_week - a.events_week).map((c) => {
                const max = Math.max(...ws.calendars.map((x) => x.events_week))
                const col = TEAM_COLOURS[c.colour] ?? TEAM_COLOURS.brass
                return (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} /> {c.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{c.events_week}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.events_week / max) * 100}%`, background: col.dot }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title="Signals">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
                {focusRatio}% of protected time survived the week across the team.
              </li>
              <li className="flex items-start gap-2.5" style={{ color: 'var(--text-secondary)' }}>
                <Moon size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
                After-hours creep is low — most meetings sit inside working windows.
              </li>
              <li className="flex items-start gap-2.5" style={{ color: 'var(--text-secondary)' }}>
                <Users size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
                {new Set(active.map((m) => m.timezone)).size} time zones — the availability finder is doing real work.
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </TeamShell>
  )
}
