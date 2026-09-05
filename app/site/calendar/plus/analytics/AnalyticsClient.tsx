'use client'
import { Clock, Moon, TrendingDown, Sparkles } from 'lucide-react'
import PlusShell, { StatCard, SectionCard } from '../PlusShell'
import { type PlusWorkspace } from '@/lib/calendar/plus'

export default function AnalyticsClient({ ws }: { ws: PlusWorkspace }) {
  const a = ws.analytics
  const maxDay = Math.max(1, ...a.week.map((d) => d.meetings + d.focus))
  const totalMeetings = a.week.reduce((s, d) => s + d.meetings, 0)
  const maxSink = Math.max(...a.top_sinks.map((s) => s.hours))

  return (
    <PlusShell workspace={ws} title="Calendar health"
      subtitle="Where your time actually goes — and a weekly review that helps you take it back."
      actions={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>This week</span>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Meetings" value={totalMeetings} hint="this week" />
        <StatCard label="Focus ratio" value={`${a.focus_ratio}%`} hint="focus vs meetings" />
        <StatCard label="After-hours" value={`${a.after_hours}h`} hint="evenings/weekends" />
        <StatCard label="Reclaimed" value={`${a.reclaimed_hours}h`} hint="by Plus rules" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Week load */}
        <div className="lg:col-span-2">
          <SectionCard title="This week"
            action={<span className="inline-flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--gold)' }} /> Meetings</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#6E8B7A' }} /> Focus</span>
            </span>}>
            <div className="flex items-end justify-around gap-3" style={{ height: 200 }}>
              {a.week.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-col justify-end gap-0.5" style={{ height: 160 }}>
                    <div className="w-full rounded-t" style={{ height: `${(d.meetings / maxDay) * 160}px`, background: 'var(--gold)' }} title={`${d.meetings} meetings`} />
                    <div className="w-full rounded-b" style={{ height: `${(d.focus / maxDay) * 160}px`, background: '#6E8B7A' }} title={`${d.focus}h focus`} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.day}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Sinks + digest */}
        <div className="space-y-6">
          <SectionCard title="Biggest time sinks">
            <div className="space-y-2.5">
              {a.top_sinks.map((s) => (
                <div key={s.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><TrendingDown size={12} style={{ color: 'var(--clay,#B4664A)' }} /> {s.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.hours}h</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.hours / maxSink) * 100}%`, background: '#B4664A' }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'var(--bg-card)' }}>
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles size={15} style={{ color: 'var(--gold)' }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.08em' }}>Weekly review</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Focus held at {a.focus_ratio}% and you reclaimed {a.reclaimed_hours}h. Wednesday was your heaviest day — consider moving one recurring sync to protect a morning block.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-center gap-2"><Clock size={13} style={{ color: 'var(--gold)' }} /> Best focus day: Friday ({a.week.find((d) => d.day === 'Fri')?.focus}h)</li>
              <li className="flex items-center gap-2"><Moon size={13} style={{ color: 'var(--gold)' }} /> After-hours creep down to {a.after_hours}h</li>
            </ul>
          </div>
        </div>
      </div>
    </PlusShell>
  )
}
