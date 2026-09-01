'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { ArrowLeft, Loader2, Clock, CalendarDays, Moon, Focus } from 'lucide-react'
import { parseRRule, expandOccurrences } from '@/lib/calendar/recurrence'

interface Ev { title: string; start_at: string; end_at: string; all_day: boolean; rrule: string | null; exdates: string[] | null; tags: string[] | null; recurrence_parent_id: string | null }
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export default function AnalyticsClient() {
  const supabase = useMemo(() => createClient() as any, [])
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { (async () => {
    const { data } = await supabase.from('calendar_events').select('title, start_at, end_at, all_day, rrule, exdates, tags, recurrence_parent_id')
    setEvents((data ?? []) as Ev[]); setLoading(false)
  })() }, [supabase])

  const stats = useMemo(() => {
    const winEnd = startOfDay(addDays(new Date(), 1))
    const winStart = addDays(winEnd, -28)
    // expand into concrete occurrences within the window
    const occ: { start: Date; end: Date; title: string }[] = []
    for (const e of events) {
      if (e.all_day) continue
      const s = new Date(e.start_at); const durMs = new Date(e.end_at).getTime() - s.getTime()
      if (e.rrule) {
        const rule = parseRRule(e.rrule); if (!rule) continue
        const ex = (e.exdates ?? []).map((x) => new Date(x))
        for (const os of expandOccurrences(s, rule, winStart, winEnd, ex)) occ.push({ start: os, end: new Date(os.getTime() + durMs), title: e.title })
      } else if (s >= winStart && s < winEnd) {
        occ.push({ start: s, end: new Date(e.end_at), title: e.title })
      }
    }
    const totalMs = occ.reduce((a, o) => a + (o.end.getTime() - o.start.getTime()), 0)
    const hours = totalMs / 3.6e6
    const byDow = Array.from({ length: 7 }, (_, i) => ({ day: DOW[i], hours: 0 }))
    let afterHours = 0
    const byTitle = new Map<string, number>()
    for (const o of occ) {
      const dow = (o.start.getDay() + 6) % 7
      byDow[dow].hours += (o.end.getTime() - o.start.getTime()) / 3.6e6
      const h = o.start.getHours()
      if (h < 8 || h >= 18) afterHours++
      byTitle.set(o.title, (byTitle.get(o.title) ?? 0) + (o.end.getTime() - o.start.getTime()) / 3.6e6)
    }
    byDow.forEach((d) => (d.hours = Math.round(d.hours * 10) / 10))
    const busiest = byDow.slice().sort((a, b) => b.hours - a.hours)[0]
    const workHoursTotal = 8 * 20 // ~4 working weeks
    const focusRatio = Math.max(0, Math.round((1 - hours / workHoursTotal) * 100))
    const topSinks = Array.from(byTitle.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { count: occ.length, hours: Math.round(hours * 10) / 10, byDow, busiest, afterHours, focusRatio, topSinks }
  }, [events])

  if (loading) return <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site max-w-4xl py-6">
        <div className="mb-1 flex items-center gap-3">
          <Link href="/calendar/app" className="btn-ghost" aria-label="Back"><ArrowLeft size={18} /></Link>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Calendar health</h1>
        </div>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>Your last 4 weeks.</p>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={<CalendarDays size={16} />} label="Meetings" value={String(stats.count)} />
          <Stat icon={<Clock size={16} />} label="Hours booked" value={`${stats.hours}h`} />
          <Stat icon={<Focus size={16} />} label="Focus ratio" value={`${stats.focusRatio}%`} />
          <Stat icon={<Moon size={16} />} label="After-hours" value={String(stats.afterHours)} />
        </div>

        <div className="mb-6 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Hours by day of week</h2>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={stats.byDow}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: 'rgba(160,131,14,0.08)' }} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)' }} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                  {stats.byDow.map((d, i) => <Cell key={i} fill={d.day === stats.busiest?.day ? '#A0830E' : 'rgba(160,131,14,0.35)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Biggest time sinks</h2>
          {stats.topSinks.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No timed events in the window.</p> : (
            <div className="space-y-2">
              {stats.topSinks.map(([title, h]) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="flex-1 truncate text-sm" style={{ color: 'var(--text-primary)' }}>{title}</span>
                  <div className="h-2 w-32 rounded-full" style={{ background: 'var(--bg-primary)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (h / (stats.topSinks[0][1] || 1)) * 100)}%`, background: 'var(--gold)' }} />
                  </div>
                  <span className="w-12 text-right text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(h * 10) / 10}h</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="mb-2 font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly review</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            You spent <strong>{stats.hours}h</strong> across <strong>{stats.count}</strong> meetings in the last four weeks
            {stats.busiest && stats.busiest.hours > 0 ? <>, heaviest on <strong>{stats.busiest.day}</strong></> : null}.
            {stats.afterHours > 0 ? <> {stats.afterHours} started outside 8am–6pm — consider protecting those edges.</> : <> Your evenings and mornings stayed clear — nicely done.</>}
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="mb-1 flex items-center gap-1.5" style={{ color: 'var(--gold)' }}>{icon}</div>
      <div className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
