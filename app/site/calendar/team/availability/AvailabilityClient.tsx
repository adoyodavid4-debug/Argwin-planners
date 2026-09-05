'use client'
import { useMemo, useState } from 'react'
import { Check, Clock, Sun, CalendarPlus } from 'lucide-react'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, localHour, fmtOffset } from '@/lib/calendar/team'

// Working window in each member's LOCAL time.
const WORK_START = 9
const WORK_END = 17
const fmtHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`

export default function AvailabilityClient({ ws }: { ws: TeamWorkspace }) {
  const activeMembers = useMemo(() => ws.members.filter((m) => m.status === 'active'), [ws.members])
  const [selected, setSelected] = useState<string[]>(activeMembers.map((m) => m.id))
  const [duration, setDuration] = useState(30)

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const chosen = activeMembers.filter((m) => selected.includes(m.id))
  const utcHours = Array.from({ length: 24 }, (_, i) => i)

  // For each UTC hour, count how many chosen members are inside their local
  // working window — that gives the overlap heat + "best times".
  const overlap = utcHours.map((u) => {
    const inWindow = chosen.filter((m) => {
      const lh = localHour(u, m.tz_offset)
      return lh >= WORK_START && lh < WORK_END
    })
    return { utc: u, count: inWindow.length }
  })
  const best = overlap.filter((o) => chosen.length > 0 && o.count === chosen.length).map((o) => o.utc)

  // Base timezone = team timezone (Nairobi, +3) for the header row label.
  const baseOffset = 3

  return (
    <TeamShell workspace={ws} currentRole="owner" title="Availability finder"
      subtitle="Find the hour that works for everyone — across every time zone, without the mental math."
      actions={<button className="btn-primary px-3.5 py-2 text-sm" disabled={best.length === 0}><CalendarPlus size={15} /> Schedule best time</button>}>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <SectionCard title="People">
            <div className="space-y-1.5">
              {activeMembers.map((m) => {
                const on = selected.includes(m.id)
                return (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-black/[0.03]">
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
                      style={on ? { background: 'var(--gold)', borderColor: 'var(--gold)' } : { borderColor: 'var(--border)' }}>
                      {on && <Check size={11} color="#fff" />}
                    </span>
                    <Avatar name={m.name} hue={m.hue} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                      <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{fmtOffset(m.tz_offset)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title="Meeting length">
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60].map((d) => (
                <button key={d} onClick={() => setDuration(d)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={duration === d ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {d}m
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Heat grid */}
        <SectionCard title="Overlap across the day"
          action={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>Shaded = inside working hours</span>}>
          {chosen.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Select at least one person.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 px-2 py-1 text-left text-[11px] font-semibold" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                      {ws.team.timezone.split('/')[1]?.replace('_', ' ')} {fmtOffset(baseOffset)}
                    </th>
                    {utcHours.map((u) => {
                      const lh = localHour(u, baseOffset)
                      const isBest = best.includes(u)
                      return (
                        <th key={u} className="px-0.5 py-1 text-[9px] font-medium" style={{ color: isBest ? 'var(--gold-dark)' : 'var(--text-muted)' }}>
                          {lh % 3 === 0 ? fmtHour(lh) : ''}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {chosen.map((m) => (
                    <tr key={m.id}>
                      <td className="sticky left-0 z-10 whitespace-nowrap px-2 py-1 text-left text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                        {m.name.split(' ')[0]}
                      </td>
                      {utcHours.map((u) => {
                        const lh = localHour(u, m.tz_offset)
                        const working = lh >= WORK_START && lh < WORK_END
                        const sleeping = lh < 7 || lh >= 22
                        return (
                          <td key={u} className="p-0">
                            <div className="mx-px h-6 rounded-sm" title={`${fmtHour(lh)} local`}
                              style={{ background: working ? 'rgba(var(--gold-rgb),0.55)' : sleeping ? 'var(--border)' : 'rgba(var(--gold-rgb),0.14)' }} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* Overlap summary row */}
                  <tr>
                    <td className="sticky left-0 z-10 px-2 py-1 text-left text-[11px] font-semibold" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Overlap</td>
                    {overlap.map((o) => {
                      const isBest = best.includes(o.utc)
                      return (
                        <td key={o.utc} className="p-0">
                          <div className="mx-px flex h-6 items-center justify-center rounded-sm text-[9px] font-bold"
                            style={isBest
                              ? { background: 'var(--gold)', color: '#fff' }
                              : { color: 'var(--text-muted)' }}>
                            {o.count > 0 ? o.count : ''}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Best times */}
          <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Clock size={15} style={{ color: 'var(--gold)' }} /> Best {duration}-minute slots for all {chosen.length}
            </p>
            {best.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hour works for everyone in working hours. Try fewer people or a wider window.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {best.map((u) => (
                  <span key={u} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{ borderColor: 'rgba(var(--gold-rgb),0.4)', background: 'rgba(var(--gold-rgb),0.08)', color: 'var(--gold-dark)' }}>
                    <Sun size={12} /> {fmtHour(localHour(u, baseOffset))} {ws.team.timezone.split('/')[1]?.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </TeamShell>
  )
}
