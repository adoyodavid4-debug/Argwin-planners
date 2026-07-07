'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, MapPin, AlignLeft, Clock,
  CalendarDays, Loader2, ArrowLeft,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────
type View = 'month' | 'week' | 'agenda'
interface CalEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string   // ISO UTC
  end_at: string     // ISO UTC
  all_day: boolean
  colour: string
}
interface Draft {
  id?: string
  title: string
  date: string       // yyyy-mm-dd (local)
  endDate: string
  startTime: string  // HH:mm
  endTime: string
  allDay: boolean
  colour: string
  location: string
  description: string
}

// ── Colour palette (masterplan §8 accents) ────────────────────
const COLOURS: Record<string, { dot: string; soft: string; label: string }> = {
  brass:    { dot: '#A0830E', soft: 'rgba(160,131,14,0.16)',  label: 'Brass' },
  sage:     { dot: '#6E8B7A', soft: 'rgba(110,139,122,0.18)', label: 'Sage' },
  clay:     { dot: '#B4664A', soft: 'rgba(180,102,74,0.18)',  label: 'Clay' },
  lavender: { dot: '#7B6FAE', soft: 'rgba(123,111,174,0.18)', label: 'Lavender' },
  slate:    { dot: '#5B6B78', soft: 'rgba(91,107,120,0.18)',  label: 'Slate' },
}
const COLOUR_KEYS = Object.keys(COLOURS)
const TZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Africa/Nairobi'

// ── Date helpers (local time) ─────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d: Date) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)) } // Monday
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const isToday = (d: Date) => sameDay(d, new Date())
const fromISO = (s: string) => new Date(s)

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtTime = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(':00', '')

function visibleRange(view: View, cursor: Date): [Date, Date] {
  if (view === 'month') { const s = startOfWeek(startOfMonth(cursor)); return [s, addDays(s, 42)] }
  if (view === 'week') { const s = startOfWeek(cursor); return [s, addDays(s, 7)] }
  const s = startOfDay(cursor); return [s, addDays(s, 30)] // agenda: 30-day horizon
}

// Light NL parse for quick-add: pull a time like "3pm" / "15:00"; default 09:00, 1h.
function parseQuickAdd(text: string, baseDay: Date): { title: string; start: Date; end: Date } {
  let title = text.trim()
  let h = 9, m = 0
  const t = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
  if (t) {
    let hh = parseInt(t[1], 10)
    const mm = t[2] ? parseInt(t[2], 10) : 0
    const ap = t[3]?.toLowerCase()
    if (ap === 'pm' && hh < 12) hh += 12
    if (ap === 'am' && hh === 12) hh = 0
    if (hh >= 0 && hh <= 23 && mm < 60) {
      h = hh; m = mm
      title = text.replace(t[0], '').replace(/\bat\b/i, '').replace(/\s+/g, ' ').trim() || text.trim()
    }
  }
  const start = startOfDay(baseDay); start.setHours(h, m, 0, 0)
  const end = new Date(start); end.setHours(end.getHours() + 1)
  return { title, start, end }
}

// ══════════════════════════════════════════════════════════════
export default function CalendarApp({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()))
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [quick, setQuick] = useState('')

  // ── Data ──
  const load = useCallback(async () => {
    setLoading(true)
    const [s, e] = visibleRange(view, cursor)
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .lte('start_at', e.toISOString())
      .gte('end_at', s.toISOString())
      .order('start_at', { ascending: true })
    if (error) {
      if (error.code === '42P01' || /relation .* does not exist|schema cache/i.test(error.message || '')) {
        setNeedsSetup(true)
      }
      setEvents([])
    } else {
      setNeedsSetup(false)
      setEvents((data ?? []) as CalEvent[])
    }
    setLoading(false)
  }, [supabase, view, cursor])

  useEffect(() => { load() }, [load])

  // ── Navigation ──
  const step = (dir: number) => {
    if (view === 'month') setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1))
    else setCursor((c) => addDays(c, dir * (view === 'week' ? 7 : 30)))
  }
  const goToday = () => setCursor(startOfDay(new Date()))

  // ── Draft / modal helpers ──
  const newDraft = (day: Date, hour?: number): Draft => {
    const start = startOfDay(day); start.setHours(hour ?? 9, 0, 0, 0)
    const end = new Date(start); end.setHours(end.getHours() + 1)
    return {
      title: '', date: ymd(start), endDate: ymd(end), startTime: hm(start), endTime: hm(end),
      allDay: false, colour: 'brass', location: '', description: '',
    }
  }
  const editDraft = (ev: CalEvent): Draft => {
    const s = fromISO(ev.start_at), e = fromISO(ev.end_at)
    return {
      id: ev.id, title: ev.title, date: ymd(s), endDate: ymd(ev.all_day ? addDays(e, -1) : e),
      startTime: hm(s), endTime: hm(e), allDay: ev.all_day, colour: ev.colour,
      location: ev.location ?? '', description: ev.description ?? '',
    }
  }

  const saveDraft = async () => {
    if (!draft || !draft.title.trim()) return
    let start: Date, end: Date
    if (draft.allDay) {
      start = startOfDay(new Date(`${draft.date}T00:00`))
      end = addDays(startOfDay(new Date(`${draft.endDate || draft.date}T00:00`)), 1) // exclusive end
    } else {
      start = new Date(`${draft.date}T${draft.startTime}`)
      end = new Date(`${draft.endDate || draft.date}T${draft.endTime}`)
      if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000)
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      location: draft.location.trim() || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: draft.allDay,
      start_tz: TZ,
      colour: draft.colour,
    }
    if (draft.id) await supabase.from('calendar_events').update(payload).eq('id', draft.id)
    else await supabase.from('calendar_events').insert(payload)
    setDraft(null)
    load()
  }

  const deleteDraft = async () => {
    if (!draft?.id) return
    await supabase.from('calendar_events').delete().eq('id', draft.id)
    setDraft(null)
    load()
  }

  const submitQuick = async () => {
    if (!quick.trim()) return
    const { title, start, end } = parseQuickAdd(quick, view === 'month' ? new Date() : cursor)
    await supabase.from('calendar_events').insert({
      title, start_at: start.toISOString(), end_at: end.toISOString(),
      all_day: false, start_tz: TZ, colour: 'brass',
    })
    setQuick('')
    load()
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (draft || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return
      if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key.toLowerCase() === 't') goToday()
      else if (e.key.toLowerCase() === 'm') setView('month')
      else if (e.key.toLowerCase() === 'w') setView('week')
      else if (e.key.toLowerCase() === 'a') setView('agenda')
      else if (e.key.toLowerCase() === 'n') setDraft(newDraft(cursor))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, view, cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  const title =
    view === 'month' ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'week' ? (() => { const s = startOfWeek(cursor), e = addDays(s, 6); return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}` })()
    : 'Agenda · next 30 days'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Link href="/calendar" className="btn-ghost" aria-label="Back to Arwign Calendar"><ArrowLeft size={18} /></Link>
            <div className="flex items-center gap-1">
              <CalendarDays size={20} style={{ color: 'var(--gold)' }} />
              <span className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Arwign Calendar</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => step(-1)} className="btn-ghost" aria-label="Previous"><ChevronLeft size={18} /></button>
            <button onClick={goToday} className="btn-outline px-3 py-1.5 text-sm">Today</button>
            <button onClick={() => step(1)} className="btn-ghost" aria-label="Next"><ChevronRight size={18} /></button>
            <span className="ml-1 min-w-[180px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border p-0.5" style={{ borderColor: 'var(--border)' }}>
              {(['month', 'week', 'agenda'] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors"
                  style={view === v ? { background: 'var(--gold)', color: 'white' } : { color: 'var(--text-secondary)' }}>
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => setDraft(newDraft(cursor))} className="btn-primary px-4 py-2 text-sm"><Plus size={15} /> New event</button>
          </div>
        </div>

        {/* Quick add */}
        <div className="mb-5 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <Plus size={15} style={{ color: 'var(--gold)' }} />
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitQuick() }}
            placeholder='Quick add — e.g. "Team standup 9am" then Enter'
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <span className="hidden sm:block text-[11px]" style={{ color: 'var(--text-muted)' }}>N new · T today · ← → move · M/W/A views</span>
        </div>

        {/* Body */}
        {needsSetup ? (
          <SetupNotice />
        ) : loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : view === 'month' ? (
          <MonthView cursor={cursor} events={events} onNewDay={(d) => setDraft(newDraft(d))} onEdit={(ev) => setDraft(editDraft(ev))} />
        ) : view === 'week' ? (
          <WeekView cursor={cursor} events={events} onNewAt={(d, h) => setDraft(newDraft(d, h))} onEdit={(ev) => setDraft(editDraft(ev))} />
        ) : (
          <AgendaView cursor={cursor} events={events} onEdit={(ev) => setDraft(editDraft(ev))} onNew={() => setDraft(newDraft(cursor))} />
        )}
      </div>

      {draft && (
        <EventModal
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
          onDelete={deleteDraft}
        />
      )}
    </div>
  )
}

// ── Month view ────────────────────────────────────────────────
function eventsOnDay(events: CalEvent[], day: Date): CalEvent[] {
  const s = startOfDay(day).getTime(), e = addDays(startOfDay(day), 1).getTime()
  return events
    .filter((ev) => fromISO(ev.start_at).getTime() < e && fromISO(ev.end_at).getTime() > s)
    .sort((a, b) => (Number(b.all_day) - Number(a.all_day)) || (fromISO(a.start_at).getTime() - fromISO(b.start_at).getTime()))
}

function MonthView({ cursor, events, onNewDay, onEdit }: {
  cursor: Date; events: CalEvent[]; onNewDay: (d: Date) => void; onEdit: (ev: CalEvent) => void
}) {
  const start = startOfWeek(startOfMonth(cursor))
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="grid grid-cols-7">
        {DOW.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const dayEvents = eventsOnDay(events, day)
          return (
            <div key={i} onClick={() => onNewDay(day)}
              className="min-h-[104px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-black/[0.02]"
              style={{ borderColor: 'var(--border)', opacity: inMonth ? 1 : 0.45 }}>
              <div className="flex justify-end">
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                  style={isToday(day) ? { background: 'var(--gold)', color: 'white' } : { color: 'var(--text-secondary)' }}>
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button key={ev.id} onClick={(e) => { e.stopPropagation(); onEdit(ev) }}
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight truncate"
                    style={{ background: COLOURS[ev.colour]?.soft ?? COLOURS.brass.soft, color: 'var(--text-primary)' }}>
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: COLOURS[ev.colour]?.dot ?? COLOURS.brass.dot }} />
                    {!ev.all_day && <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtTime(fromISO(ev.start_at))}</span>}
                    <span className="truncate">{ev.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && <div className="px-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week view (time grid) ─────────────────────────────────────
const HOUR_H = 44
function WeekView({ cursor, events, onNewAt, onEdit }: {
  cursor: Date; events: CalEvent[]; onNewAt: (d: Date, h: number) => void; onEdit: (ev: CalEvent) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H }, [])
  const weekStart = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      {/* day headers */}
      <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
        <div className="border-b border-r" style={{ borderColor: 'var(--border)' }} />
        {days.map((d, i) => (
          <div key={i} className="border-b border-r py-2 text-center" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{DOW[i]}</div>
            <div className="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium"
              style={isToday(d) ? { background: 'var(--gold)', color: 'white' } : { color: 'var(--text-primary)' }}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      {/* all-day row */}
      <div className="grid border-b" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', borderColor: 'var(--border)' }}>
        <div className="py-1 pr-1 text-right text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>All-day</div>
        {days.map((d, i) => (
          <div key={i} className="min-h-[26px] border-r p-0.5" style={{ borderColor: 'var(--border)' }}>
            {eventsOnDay(events, d).filter((e) => e.all_day).map((ev) => (
              <button key={ev.id} onClick={() => onEdit(ev)} className="mb-0.5 block w-full truncate rounded px-1 text-[10px]"
                style={{ background: COLOURS[ev.colour]?.soft, color: 'var(--text-primary)' }}>{ev.title}</button>
            ))}
          </div>
        ))}
      </div>
      {/* hour grid */}
      <div ref={scrollRef} className="max-h-[560px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="relative border-r text-right" style={{ height: HOUR_H, borderColor: 'var(--border)' }}>
                <span className="absolute -top-1.5 right-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>{h === 0 ? '' : `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`}</span>
              </div>
            ))}
          </div>
          {days.map((day, di) => {
            const timed = eventsOnDay(events, day).filter((e) => !e.all_day)
            return (
              <div key={di} className="relative border-r" style={{ borderColor: 'var(--border)' }}>
                {hours.map((h) => (
                  <div key={h} onClick={() => onNewAt(day, h)} className="border-b transition-colors hover:bg-black/[0.02]" style={{ height: HOUR_H, borderColor: 'var(--border)' }} />
                ))}
                {timed.map((ev) => {
                  const s = fromISO(ev.start_at), e = fromISO(ev.end_at)
                  const dayStart = startOfDay(day)
                  const top = Math.max(0, ((s.getTime() - dayStart.getTime()) / 3.6e6) * HOUR_H)
                  const bottom = Math.min(24 * HOUR_H, ((e.getTime() - dayStart.getTime()) / 3.6e6) * HOUR_H)
                  const height = Math.max(16, bottom - top)
                  return (
                    <button key={ev.id} onClick={(ce) => { ce.stopPropagation(); onEdit(ev) }}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1 py-0.5 text-left text-[10px] leading-tight"
                      style={{ top, height, background: COLOURS[ev.colour]?.soft, borderLeft: `3px solid ${COLOURS[ev.colour]?.dot}`, color: 'var(--text-primary)' }}>
                      <div className="truncate font-medium">{ev.title}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{fmtTime(s)}</div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Agenda view ───────────────────────────────────────────────
function AgendaView({ cursor, events, onEdit, onNew }: {
  cursor: Date; events: CalEvent[]; onEdit: (ev: CalEvent) => void; onNew: () => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    const [s, e] = visibleRange('agenda', cursor)
    for (let d = new Date(s); d < e; d = addDays(d, 1)) {
      const list = eventsOnDay(events, d)
      if (list.length) map.set(ymd(d), list)
    }
    return Array.from(map.entries())
  }, [events, cursor])

  if (!groups.length) {
    return (
      <div className="rounded-2xl border py-20 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <CalendarDays size={30} className="mx-auto mb-3" style={{ color: 'var(--gold)' }} />
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Nothing scheduled in the next 30 days.</p>
        <button onClick={onNew} className="btn-primary px-4 py-2 text-sm"><Plus size={15} /> Add an event</button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {groups.map(([key, list]) => {
        const d = new Date(`${key}T00:00`)
        return (
          <div key={key} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="font-display text-lg font-semibold" style={{ color: isToday(d) ? 'var(--gold)' : 'var(--text-primary)' }}>{d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{DOW[(d.getDay() + 6) % 7]}{isToday(d) ? ' · Today' : ''}</span>
            </div>
            <div className="space-y-1.5">
              {list.map((ev) => (
                <button key={ev.id} onClick={() => onEdit(ev)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-black/[0.03]">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: COLOURS[ev.colour]?.dot }} />
                  <span className="w-24 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>{ev.all_day ? 'All day' : `${fmtTime(fromISO(ev.start_at))}–${fmtTime(fromISO(ev.end_at))}`}</span>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</span>
                  {ev.location && <span className="hidden sm:flex items-center gap-1 text-xs truncate" style={{ color: 'var(--text-muted)' }}><MapPin size={11} /> {ev.location}</span>}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Event modal ───────────────────────────────────────────────
function EventModal({ draft, onChange, onClose, onSave, onDelete }: {
  draft: Draft; onChange: (d: Draft) => void; onClose: () => void; onSave: () => void; onDelete: () => void
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(20,16,10,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border p-5 shadow-glass-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{draft.id ? 'Edit event' : 'New event'}</h3>
          <button onClick={onClose} className="btn-ghost" aria-label="Close"><X size={18} /></button>
        </div>

        <input autoFocus value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Add a title"
          className="mb-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />

        <label className="mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={draft.allDay} onChange={(e) => set({ allDay: e.target.checked })} className="accent-[#A0830E]" />
          All day
        </label>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <Field icon={<Clock size={13} />} label="Starts">
            <div className="flex gap-1">
              <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} className="flex-1 rounded-lg border px-2 py-1.5 text-xs" style={inp} />
              {!draft.allDay && <input type="time" value={draft.startTime} onChange={(e) => set({ startTime: e.target.value })} className="rounded-lg border px-2 py-1.5 text-xs" style={inp} />}
            </div>
          </Field>
          <Field icon={<Clock size={13} />} label="Ends">
            <div className="flex gap-1">
              <input type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} className="flex-1 rounded-lg border px-2 py-1.5 text-xs" style={inp} />
              {!draft.allDay && <input type="time" value={draft.endTime} onChange={(e) => set({ endTime: e.target.value })} className="rounded-lg border px-2 py-1.5 text-xs" style={inp} />}
            </div>
          </Field>
        </div>

        <div className="mb-3">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Colour</span>
          <div className="flex gap-2">
            {COLOUR_KEYS.map((k) => (
              <button key={k} onClick={() => set({ colour: k })} aria-label={COLOURS[k].label}
                className="h-7 w-7 rounded-full transition-transform"
                style={{ background: COLOURS[k].dot, outline: draft.colour === k ? `2px solid var(--text-primary)` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="Location" className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="mb-4 flex items-start gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <AlignLeft size={14} className="mt-1" style={{ color: 'var(--text-muted)' }} />
          <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Notes" rows={2} className="flex-1 resize-none bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>

        <div className="flex items-center justify-between">
          {draft.id ? (
            <button onClick={onDelete} className="inline-flex items-center gap-1 text-sm" style={{ color: '#B4664A' }}><Trash2 size={15} /> Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline px-4 py-2 text-sm">Cancel</button>
            <button onClick={onSave} disabled={!draft.title.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{draft.id ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{icon} {label}</span>
      {children}
    </div>
  )
}

// ── Setup notice (table not migrated yet) ─────────────────────
function SetupNotice() {
  return (
    <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <CalendarDays size={30} className="mx-auto mb-3" style={{ color: 'var(--gold)' }} />
      <h3 className="mb-2 font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Calendar setup pending</h3>
      <p className="mx-auto max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
        The <code>calendar_events</code> table isn’t created yet. Apply migration
        <code className="mx-1 rounded px-1" style={{ background: 'rgba(160,131,14,0.14)' }}>014_calendar_events.sql</code>
        in the Supabase SQL editor, then reload this page.
      </p>
    </div>
  )
}
