'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_TZ } from '@/lib/calendar/fmt'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Bell, BellRing, CalendarDays, ArrowRight, Check, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export interface WidgetEvent { id: string; title: string; start_at: string; end_at: string; all_day: boolean; location: string | null; colour: string | null }

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const monthLabel = (d: Date) => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d)
const timeLabel = (iso: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
const dayLabel = (iso: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))

// Build a 6-week grid (Mon-first) covering the given month.
function monthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7 // days from Monday
  const start = new Date(first); start.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
}

export default function CalendarWidget({ initialEvents, isLoggedIn }: { initialEvents: WidgetEvent[]; isLoggedIn: boolean }) {
  const supabase = useMemo(() => createClient() as any, [])
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(today)
  const [events, setEvents] = useState<WidgetEvent[]>(initialEvents)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [remindOn, setRemindOn] = useState(false)
  const [form, setForm] = useState({ title: '', time: '09:00', duration: 30, location: '' })

  const grid = monthGrid(cursor)

  // Load events for the visible month (logged-in users only).
  const loadMonth = useCallback(async () => {
    if (!isLoggedIn) return
    const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString()
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toISOString()
    const { data } = await supabase.from('calendar_events').select('id, title, start_at, end_at, all_day, location, colour').gte('start_at', from).lt('start_at', to).order('start_at')
    if (data) setEvents(data)
  }, [supabase, cursor, isLoggedIn])
  useEffect(() => { loadMonth() }, [loadMonth])

  const eventsOn = (d: Date) => events.filter((e) => sameDay(new Date(e.start_at), d))
  const upcoming = events.filter((e) => new Date(e.end_at) >= today).slice(0, 4)
  const dayEvents = eventsOn(selected)

  // In-session reminders: fire a browser notification 30 min before start.
  useEffect(() => {
    if (!remindOn || typeof Notification === 'undefined') return
    const timers: any[] = []
    for (const e of events) {
      const fireAt = new Date(e.start_at).getTime() - 30 * 60000
      const delay = fireAt - Date.now()
      if (delay > 0 && delay < 24 * 3600000) {
        timers.push(setTimeout(() => { try { new Notification('Arwign · in 30 minutes', { body: e.title }) } catch {} }, delay))
      }
    }
    return () => timers.forEach(clearTimeout)
  }, [remindOn, events])

  const toggleReminders = async () => {
    if (remindOn) { setRemindOn(false); return }
    if (typeof Notification === 'undefined') { toast.error('Reminders aren’t supported in this browser.'); return }
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (perm === 'granted') { setRemindOn(true); toast.success('Reminders on — you’ll be nudged 30 min before, while the site is open.') }
    else toast.error('Allow notifications to get reminders.')
  }

  const addEvent = async () => {
    if (!form.title.trim()) { toast.error('Give it a title.'); return }
    const [h, m] = form.time.split(':').map(Number)
    const start = new Date(selected); start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + form.duration * 60000)
    setSaving(true)
    try {
      const { data, error } = await supabase.from('calendar_events')
        .insert({ title: form.title.trim(), location: form.location.trim() || null, start_at: start.toISOString(), end_at: end.toISOString(), start_tz: DEFAULT_TZ, colour: 'brass' })
        .select('id, title, start_at, end_at, all_day, location, colour').single()
      if (error) throw error
      setEvents((ev) => [...ev, data].sort((a, b) => a.start_at.localeCompare(b.start_at)))
      setForm({ title: '', time: '09:00', duration: 30, location: '' })
      setAdding(false)
      toast.success('Added to your calendar ✦')
    } catch (e: any) { toast.error(e?.message || 'Could not add event.') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-3xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} style={{ color: 'var(--gold)' }} />
            <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>Arwign Calendar</h2>
          </div>
          <button onClick={toggleReminders} title="Reminders" className="p-1.5 rounded-lg transition-colors" style={{ color: remindOn ? 'var(--gold)' : 'var(--text-muted)' }}>
            {remindOn ? <BellRing size={16} /> : <Bell size={16} />}
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Schedule meetings, appointments &amp; reminders.</p>
      </div>

      {/* Month nav */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <span className="font-medium text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{monthLabel(cursor)}</span>
        <div className="flex items-center gap-1">
          <button aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={15} /></button>
          <button aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Grid */}
      <div className="px-5 pb-4 pt-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW.map((d) => <span key={d} className="text-center text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth()
            const isToday = sameDay(d, today)
            const isSel = sameDay(d, selected)
            const has = eventsOn(d).length > 0
            return (
              <button key={i} onClick={() => setSelected(new Date(d))}
                className="relative aspect-square rounded-lg text-xs flex items-center justify-center transition-all tabular-nums"
                style={{
                  background: isSel ? 'var(--gold)' : isToday ? 'rgba(var(--gold-rgb),0.12)' : 'transparent',
                  color: isSel ? '#fff' : inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                  opacity: inMonth ? 1 : 0.4,
                }}>
                {d.getDate()}
                {has && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: isSel ? '#fff' : 'var(--gold)' }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day / upcoming */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{sameDay(selected, today) ? 'Today' : dayLabel(selected.toISOString())}</p>
          {isLoggedIn && <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--gold)' }}><Plus size={13} /> New</button>}
        </div>

        <AnimatePresence>
          {adding && isLoggedIn && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-2xl border p-3 mb-3 space-y-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Meeting, appointment…" className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                <div className="flex gap-2">
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="rounded-lg border px-2 py-2 text-sm flex-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                  <select value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })} className="rounded-lg border px-2 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m}m</option>)}
                  </select>
                </div>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location / link (optional)" className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                <div className="flex gap-2">
                  <button onClick={addEvent} disabled={saving} className="btn-primary flex-1 justify-center !py-2 text-sm">{saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Add</>}</button>
                  <button onClick={() => setAdding(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="space-y-1.5 min-h-[40px]">
          {(dayEvents.length ? dayEvents : upcoming).slice(0, 4).map((e) => (
            <li key={e.id} className="flex items-start gap-2.5 rounded-xl px-3 py-2" style={{ background: 'var(--bg-secondary)' }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                <p className="text-[11px] flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                  <span className="inline-flex items-center gap-1"><Clock size={10} /> {dayEvents.length ? timeLabel(e.start_at) : `${dayLabel(e.start_at)} · ${timeLabel(e.start_at)}`}</span>
                  {e.location && <span className="inline-flex items-center gap-1 truncate"><MapPin size={10} /> {e.location}</span>}
                </p>
              </div>
            </li>
          ))}
          {!(dayEvents.length || upcoming.length) && (
            <li className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>{isLoggedIn ? 'Nothing scheduled — add something.' : 'Sign in to see and schedule your events.'}</li>
          )}
        </ul>
      </div>

      {/* Actions */}
      <div className="p-4 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
        {isLoggedIn ? (
          <Link href="/calendar/app" className="btn-outline justify-center !py-2 text-sm">Open full calendar <ArrowRight size={14} /></Link>
        ) : (
          <Link href="/auth/login?redirect=/calendar/app" className="btn-outline justify-center !py-2 text-sm">Sign in to schedule <ArrowRight size={14} /></Link>
        )}
        <Link href="/calendar/book/arwign" className="btn-primary justify-center !py-2 text-sm">Book a meeting</Link>
        <Link href="/calendar" className="text-center text-xs hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>About Arwign Calendar →</Link>
      </div>
    </div>
  )
}
