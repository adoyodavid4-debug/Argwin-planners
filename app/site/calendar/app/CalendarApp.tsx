'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, MapPin, AlignLeft, Clock,
  CalendarDays, Loader2, ArrowLeft, Link2, Search, Repeat, Bell, Tag as TagIcon,
  Command, Upload, Download, Settings as SettingsIcon, Sun, Moon, Palette,
  Globe2, BarChart3, Video, Check, Sparkles, Users,
} from 'lucide-react'
import {
  parseRRule, buildRRule, expandOccurrences, describeRRule, type RRule, type Weekday, WEEKDAYS,
} from '@/lib/calendar/recurrence'
import { eventsToICS, parseICS } from '@/lib/calendar/ics'
import { parseNaturalLanguage } from '@/lib/calendar/nl'
import { loadSettings, saveSettings, type CalendarSettings, defaultSettings } from '@/lib/calendar/settings'
import { REMINDER_PRESETS, CHANNEL_LABELS, describeReminder } from '@/lib/calendar/reminders'
import type { Reminder, ReminderChannel } from '@/lib/calendar/settings'
import PlusPanel from './PlusPanel'

// ── Types ─────────────────────────────────────────────────────
type View = 'day' | 'week' | 'month' | 'agenda' | 'year'
interface CalEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string
  all_day: boolean
  colour: string
  rrule: string | null
  exdates: string[] | null
  recurrence_parent_id: string | null
  recurrence_date: string | null
  tags: string[] | null
  event_type: string | null
  visibility: string | null
  status: string | null
  conferencing: string | null
  reminders: Reminder[] | null
}
// A concrete thing rendered on the grid (a single occurrence).
interface Occ {
  key: string
  masterId: string
  ev: CalEvent
  start: Date
  end: Date
  isRecurring: boolean
  isException: boolean
  origDate: Date | null // original occurrence start (for exceptions/exdate)
}
interface Draft {
  id?: string
  masterId?: string
  title: string
  date: string
  endDate: string
  startTime: string
  endTime: string
  allDay: boolean
  colour: string
  location: string
  description: string
  conferencing: string
  tags: string[]
  rrule: string | null
  reminders: Reminder[]
  // recurrence editing context
  isRecurring: boolean
  origDate: Date | null
}

// ── Colours (masterplan §8) ───────────────────────────────────
const COLOURS: Record<string, { dot: string; soft: string; label: string }> = {
  brass:    { dot: '#A0830E', soft: 'rgba(160,131,14,0.16)',  label: 'Brass' },
  sage:     { dot: '#6E8B7A', soft: 'rgba(110,139,122,0.18)', label: 'Sage' },
  clay:     { dot: '#B4664A', soft: 'rgba(180,102,74,0.18)',  label: 'Clay' },
  lavender: { dot: '#7B6FAE', soft: 'rgba(123,111,174,0.18)', label: 'Lavender' },
  slate:    { dot: '#5B6B78', soft: 'rgba(91,107,120,0.18)',  label: 'Slate' },
  rose:     { dot: '#B15B7E', soft: 'rgba(177,91,126,0.18)',  label: 'Rose' },
  ocean:    { dot: '#3E7C97', soft: 'rgba(62,124,151,0.18)',  label: 'Ocean' },
  honey:    { dot: '#C9902B', soft: 'rgba(201,144,43,0.18)',  label: 'Honey' },
  forest:   { dot: '#4B7A4E', soft: 'rgba(75,122,78,0.18)',   label: 'Forest' },
  plum:     { dot: '#8E5B8E', soft: 'rgba(142,91,142,0.18)',  label: 'Plum' },
}
const COLOUR_KEYS = Object.keys(COLOURS)

// Stable string hash → palette index, so events auto-vary in colour by their
// tag / type / title. 'brass' is treated as "auto" (unset); any other explicit
// colour a user picks is respected as-is.
const hashStr = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }
function resolveColour(ev: { colour?: string | null; tags?: string[] | null; event_type?: string | null; title?: string }): string {
  if (ev.colour && ev.colour !== 'brass' && COLOURS[ev.colour]) return ev.colour
  const seed = (ev.tags && ev.tags[0]) || ev.event_type || ev.title || 'brass'
  return COLOUR_KEYS[hashStr(String(seed)) % COLOUR_KEYS.length]
}
const localTZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Africa/Nairobi'

// ── Date helpers (browser-local) ──────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const startOfWeek = (d: Date, weekStart = 1) => { const x = startOfDay(d); const diff = (x.getDay() - weekStart + 7) % 7; return addDays(x, -diff) }
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const isToday = (d: Date) => sameDay(d, new Date())
const fromISO = (s: string) => new Date(s)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtTime = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(':00', '')

function dowLabels(weekStart: number): string[] {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return Array.from({ length: 7 }, (_, i) => base[(i + weekStart) % 7])
}

function visibleRange(view: View, cursor: Date, weekStart: number): [Date, Date] {
  if (view === 'month') { const s = startOfWeek(startOfMonth(cursor), weekStart); return [s, addDays(s, 42)] }
  if (view === 'week') { const s = startOfWeek(cursor, weekStart); return [s, addDays(s, 7)] }
  if (view === 'day') { const s = startOfDay(cursor); return [s, addDays(s, 1)] }
  if (view === 'year') { const s = new Date(cursor.getFullYear(), 0, 1); return [s, new Date(cursor.getFullYear() + 1, 0, 1)] }
  const s = startOfDay(cursor); return [s, addDays(s, 30)] // agenda
}

// ══════════════════════════════════════════════════════════════
//  Occurrence expansion
// ══════════════════════════════════════════════════════════════
function buildOccurrences(
  masters: CalEvent[], exceptions: CalEvent[], winStart: Date, winEnd: Date,
): Occ[] {
  const out: Occ[] = []
  const exByParent = new Map<string, Set<number>>()
  for (const ex of exceptions) {
    if (ex.recurrence_parent_id && ex.recurrence_date) {
      const set = exByParent.get(ex.recurrence_parent_id) ?? new Set<number>()
      set.add(new Date(ex.recurrence_date).getTime())
      exByParent.set(ex.recurrence_parent_id, set)
    }
  }

  for (const m of masters) {
    if (m.status === 'cancelled') continue
    const start = fromISO(m.start_at)
    const durMs = fromISO(m.end_at).getTime() - start.getTime()
    if (m.rrule) {
      const rule = parseRRule(m.rrule)
      if (!rule) continue
      const exdates = (m.exdates ?? []).map((s) => new Date(s))
      const occs = expandOccurrences(start, rule, addDays(winStart, -1), addDays(winEnd, 1), exdates)
      const overridden = exByParent.get(m.id) ?? new Set<number>()
      for (const os of occs) {
        if (overridden.has(os.getTime())) continue
        const oe = new Date(os.getTime() + durMs)
        if (oe <= winStart || os >= winEnd) continue
        out.push({ key: `${m.id}:${os.getTime()}`, masterId: m.id, ev: m, start: os, end: oe, isRecurring: true, isException: false, origDate: os })
      }
    } else {
      const e = fromISO(m.end_at)
      if (e > winStart && start < winEnd) {
        out.push({ key: m.id, masterId: m.id, ev: m, start, end: e, isRecurring: false, isException: false, origDate: null })
      }
    }
  }
  for (const ex of exceptions) {
    if (ex.status === 'cancelled') continue
    const s = fromISO(ex.start_at), e = fromISO(ex.end_at)
    if (e > winStart && s < winEnd) {
      out.push({
        key: ex.id, masterId: ex.recurrence_parent_id ?? ex.id, ev: ex, start: s, end: e,
        isRecurring: true, isException: true, origDate: ex.recurrence_date ? new Date(ex.recurrence_date) : null,
      })
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}

// ══════════════════════════════════════════════════════════════
export default function CalendarApp({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient() as any, [])
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState<CalendarSettings>(() => defaultSettings())
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()))
  const [allEvents, setAllEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [quick, setQuick] = useState('')
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [scopeAsk, setScopeAsk] = useState<null | { mode: 'edit' | 'delete'; run: (scope: 'this' | 'all') => void }>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const weekStart = settings.week_start ?? 1
  const DOW = useMemo(() => dowLabels(weekStart), [weekStart])

  // ── Load settings + apply theme ──
  useEffect(() => {
    (async () => {
      const s = await loadSettings(supabase)
      setSettings(s)
      setView(s.default_view === 'agenda' ? 'agenda' : (s.default_view as View))
      setTheme(s.theme === 'system' ? 'light' : s.theme)
    })()
  }, [supabase, setTheme])

  // Register the service worker (enables Web Push once VAPID keys are set).
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // ── Load events ──
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('calendar_events').select('*').order('start_at', { ascending: true })
    if (error) {
      if (error.code === '42P01' || /relation .* does not exist|schema cache|column .* does not exist/i.test(error.message || '')) {
        setNeedsSetup(true)
      }
      setAllEvents([])
    } else {
      setNeedsSetup(false)
      setAllEvents((data ?? []) as CalEvent[])
    }
    setLoading(false)
  }, [supabase])
  useEffect(() => { load() }, [load])

  // ── Occurrences for the current window + filters ──
  const occs = useMemo(() => {
    const [ws, we] = visibleRange(view, cursor, weekStart)
    const masters = allEvents.filter((e) => !e.recurrence_parent_id)
    const exceptions = allEvents.filter((e) => e.recurrence_parent_id)
    let list = buildOccurrences(masters, exceptions, ws, we)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((o) => `${o.ev.title} ${o.ev.description ?? ''} ${o.ev.location ?? ''}`.toLowerCase().includes(q))
    if (activeTags.length) list = list.filter((o) => (o.ev.tags ?? []).some((t) => activeTags.includes(t)))
    return list
  }, [allEvents, view, cursor, weekStart, search, activeTags])

  // Today's occurrences, for the right-hand "Today" rail (independent of the
  // grid's current view/cursor).
  const todayOccs = useMemo(() => {
    const ds = startOfDay(new Date()); const de = addDays(ds, 1)
    const masters = allEvents.filter((e) => !e.recurrence_parent_id)
    const exceptions = allEvents.filter((e) => e.recurrence_parent_id)
    return buildOccurrences(masters, exceptions, ds, de).sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [allEvents])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    allEvents.forEach((e) => (e.tags ?? []).forEach((t) => s.add(t)))
    return Array.from(s).sort()
  }, [allEvents])

  // ── Navigation ──
  const step = (dir: number) => {
    if (view === 'month') setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1))
    else if (view === 'year') setCursor((c) => new Date(c.getFullYear() + dir, c.getMonth(), 1))
    else setCursor((c) => addDays(c, dir * (view === 'week' ? 7 : view === 'agenda' ? 30 : 1)))
  }
  const goToday = () => setCursor(startOfDay(new Date()))

  // ── Draft helpers ──
  const blankDraft = (day: Date, hour?: number): Draft => {
    const start = startOfDay(day); start.setHours(hour ?? 9, 0, 0, 0)
    const end = new Date(start); end.setHours(end.getHours() + 1)
    return {
      title: '', date: ymd(start), endDate: ymd(end), startTime: hm(start), endTime: hm(end),
      allDay: false, colour: 'brass', location: '', description: '', conferencing: '',
      tags: [], rrule: null, reminders: settings.reminder_defaults ?? [], isRecurring: false, origDate: null,
    }
  }
  const draftFromOcc = (o: Occ): Draft => ({
    id: o.ev.id,
    masterId: o.masterId,
    title: o.ev.title,
    date: ymd(o.start),
    endDate: ymd(o.ev.all_day ? addDays(o.end, -1) : o.end),
    startTime: hm(o.start), endTime: hm(o.end),
    allDay: o.ev.all_day, colour: o.ev.colour,
    location: o.ev.location ?? '', description: o.ev.description ?? '', conferencing: o.ev.conferencing ?? '',
    tags: o.ev.tags ?? [], rrule: o.ev.rrule ?? null,
    reminders: o.ev.reminders ?? [], isRecurring: o.isRecurring, origDate: o.origDate,
  })

  function draftToPayload(d: Draft) {
    let start: Date, end: Date
    if (d.allDay) {
      start = startOfDay(new Date(`${d.date}T00:00`))
      end = addDays(startOfDay(new Date(`${d.endDate || d.date}T00:00`)), 1)
    } else {
      start = new Date(`${d.date}T${d.startTime}`)
      end = new Date(`${d.endDate || d.date}T${d.endTime}`)
      if (end <= start) end = new Date(start.getTime() + 3600_000)
    }
    return {
      title: d.title.trim(),
      description: d.description.trim() || null,
      location: d.location.trim() || null,
      conferencing: d.conferencing.trim() || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: d.allDay,
      start_tz: settings.timezone || localTZ,
      colour: d.colour,
      tags: d.tags,
      rrule: d.rrule,
      reminders: d.reminders,
    }
  }

  // ── Save ──
  const saveDraft = async () => {
    if (!draft || !draft.title.trim()) return
    const payload = draftToPayload(draft)

    // New event
    if (!draft.id) {
      await supabase.from('calendar_events').insert(payload)
      setDraft(null); load(); return
    }
    // Existing, non-recurring → simple update
    if (!draft.isRecurring) {
      await supabase.from('calendar_events').update(payload).eq('id', draft.id)
      setDraft(null); load(); return
    }
    // Recurring: ask scope
    const commit = async (scope: 'this' | 'all') => {
      if (scope === 'all') {
        // Update the master's fields (keep master's own start date, apply new time/duration)
        await supabase.from('calendar_events').update({
          title: payload.title, description: payload.description, location: payload.location,
          conferencing: payload.conferencing, colour: payload.colour, tags: payload.tags,
          reminders: payload.reminders, rrule: payload.rrule,
        }).eq('id', draft.masterId)
      } else {
        // This occurrence → detached exception + exdate on master
        if (draft.origDate && draft.id === draft.masterId) {
          const master = allEvents.find((e) => e.id === draft.masterId)
          const exdates = [...(master?.exdates ?? []), draft.origDate.toISOString()]
          await supabase.from('calendar_events').update({ exdates }).eq('id', draft.masterId)
          await supabase.from('calendar_events').insert({
            ...payload, rrule: null,
            recurrence_parent_id: draft.masterId,
            recurrence_date: draft.origDate.toISOString(),
          })
        } else {
          // editing an already-detached exception row
          await supabase.from('calendar_events').update({ ...payload, rrule: null }).eq('id', draft.id)
        }
      }
      setScopeAsk(null); setDraft(null); load()
    }
    setScopeAsk({ mode: 'edit', run: commit })
  }

  // ── Delete ──
  const deleteDraft = async () => {
    if (!draft?.id) return
    if (!draft.isRecurring) {
      await supabase.from('calendar_events').delete().eq('id', draft.id)
      setDraft(null); load(); return
    }
    const commit = async (scope: 'this' | 'all') => {
      if (scope === 'all') {
        await supabase.from('calendar_events').delete().eq('id', draft.masterId)
      } else {
        if (draft.origDate) {
          const master = allEvents.find((e) => e.id === draft.masterId)
          const exdates = [...(master?.exdates ?? []), draft.origDate.toISOString()]
          await supabase.from('calendar_events').update({ exdates }).eq('id', draft.masterId)
        }
        if (draft.id !== draft.masterId) await supabase.from('calendar_events').delete().eq('id', draft.id)
      }
      setScopeAsk(null); setDraft(null); load()
    }
    setScopeAsk({ mode: 'delete', run: commit })
  }

  // ── Quick add (NL) ──
  const submitQuick = async () => {
    if (!quick.trim()) return
    const p = parseNaturalLanguage(quick, view === 'month' || view === 'year' ? new Date() : cursor)
    await supabase.from('calendar_events').insert({
      title: p.title, start_at: p.start.toISOString(), end_at: p.end.toISOString(),
      all_day: p.allDay, start_tz: settings.timezone || localTZ, colour: 'brass',
      location: p.location, rrule: p.rrule, reminders: settings.reminder_defaults ?? [],
    })
    setQuick(''); load()
  }

  // ── ICS import / export ──
  const exportICS = () => {
    const ics = eventsToICS(allEvents.filter((e) => !e.recurrence_parent_id).map((e) => ({
      id: e.id, title: e.title, description: e.description, location: e.location,
      start_at: e.start_at, end_at: e.end_at, all_day: e.all_day, rrule: e.rrule,
    })))
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'arwign-calendar.ics'; a.click()
    URL.revokeObjectURL(url)
  }
  const importICS = async (file: File) => {
    const text = await file.text()
    const parsed = parseICS(text)
    if (!parsed.length) return
    const rows = parsed.map((p) => ({
      title: p.title, description: p.description, location: p.location,
      start_at: p.start_at, end_at: p.end_at, all_day: p.all_day,
      start_tz: settings.timezone || localTZ, colour: 'sage', rrule: p.rrule,
    }))
    await supabase.from('calendar_events').insert(rows)
    load()
  }

  // ── Theme / density ──
  const applyTheme = (t: CalendarSettings['theme']) => {
    setSettings((s) => ({ ...s, theme: t })); setTheme(t === 'system' ? 'light' : t); saveSettings(supabase, { theme: t })
  }
  const toggleDensity = () => {
    const d = settings.density === 'compact' ? 'comfortable' : 'compact'
    setSettings((s) => ({ ...s, density: d })); saveSettings(supabase, { density: d })
  }
  const compact = settings.density === 'compact'

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); return }
      const el = e.target as HTMLElement
      if (draft || paletteOpen || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return
      if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key.toLowerCase() === 't') goToday()
      else if (e.key.toLowerCase() === 'd') setView('day')
      else if (e.key.toLowerCase() === 'w') setView('week')
      else if (e.key.toLowerCase() === 'm') setView('month')
      else if (e.key.toLowerCase() === 'a') setView('agenda')
      else if (e.key.toLowerCase() === 'y') setView('year')
      else if (e.key.toLowerCase() === 'n') setDraft(blankDraft(cursor))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, paletteOpen, view, cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  const title =
    view === 'month' ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'year' ? `${cursor.getFullYear()}`
    : view === 'day' ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(cursor)
    : view === 'week' ? (() => { const s = startOfWeek(cursor, weekStart), e = addDays(s, 6); return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}` })()
    : 'Agenda · next 30 days'

  const openOcc = (o: Occ) => setDraft(draftFromOcc(o))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex">
        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col gap-5 border-r p-4 min-h-screen" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Link href="/calendar" className="btn-ghost" aria-label="Back"><ArrowLeft size={16} /></Link>
            <CalendarDays size={18} style={{ color: 'var(--gold)' }} />
            <span className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Arwign</span>
          </div>
          <button onClick={() => setDraft(blankDraft(cursor))} className="btn-primary justify-center py-2.5"><Plus size={16} /> New event</button>

          {allTags.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((t) => {
                  const on = activeTags.includes(t)
                  return (
                    <button key={t} onClick={() => setActiveTags((a) => on ? a.filter((x) => x !== t) : [...a, t])}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                      style={{ background: on ? 'var(--gold)' : 'transparent', color: on ? '#fff' : 'var(--text-secondary)', borderColor: on ? 'var(--gold)' : 'var(--border)' }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : COLOURS[resolveColour({ tags: [t] })].dot }} />
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {(settings.world_clocks ?? []).length > 0 && <WorldClocks zones={settings.world_clocks} />}

          <nav className="space-y-1 text-sm">
            <button onClick={() => setPlusOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-semibold transition-colors hover:bg-black/[0.04]"
              style={{ color: 'var(--gold-dark)' }}>
              <Sparkles size={15} /> Arwign Plus
            </button>
            <SideLink href="/calendar/plus" icon={<Sparkles size={15} />} label="Plus workspace" />
            <SideLink href="/calendar/team" icon={<Users size={15} />} label="Team workspace" />
            <SideLink href="/calendar/booking-pages" icon={<Link2 size={15} />} label="Booking pages" />
            <SideLink href="/calendar/polls" icon={<CalendarDays size={15} />} label="Meeting polls" />
            <SideLink href="/calendar/analytics" icon={<BarChart3 size={15} />} label="Analytics" />
            <SideLink href="/calendar/settings" icon={<SettingsIcon size={15} />} label="Settings" />
          </nav>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 min-w-0">
          <div className="container-site py-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => step(-1)} className="btn-ghost" aria-label="Previous"><ChevronLeft size={18} /></button>
                <button onClick={goToday} className="btn-outline px-3 py-1.5 text-sm">Today</button>
                <button onClick={() => step(1)} className="btn-ghost" aria-label="Next"><ChevronRight size={18} /></button>
                <span className="ml-1 min-w-[160px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative hidden md:block">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
                    className="w-40 rounded-lg border pl-8 pr-2 py-1.5 text-sm outline-none focus:ring-2"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                </div>
                <div className="inline-flex rounded-xl border p-0.5" style={{ borderColor: 'var(--border)' }}>
                  {(['day', 'week', 'month', 'agenda', 'year'] as View[]).map((v) => (
                    <button key={v} onClick={() => setView(v)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize"
                      style={view === v ? { background: 'var(--gold)', color: 'white' } : { color: 'var(--text-secondary)' }}>{v}</button>
                  ))}
                </div>
                <ThemeMenu theme={settings.theme} onTheme={applyTheme} compact={compact} onDensity={toggleDensity} />
                <button onClick={() => fileRef.current?.click()} className="btn-ghost" title="Import .ics"><Upload size={16} /></button>
                <button onClick={exportICS} className="btn-ghost" title="Export .ics"><Download size={16} /></button>
                <button onClick={() => setPaletteOpen(true)} className="btn-ghost" title="Command palette (⌘K)"><Command size={16} /></button>
                <button onClick={() => setPlusOpen(true)} className="btn-outline px-3 py-2 text-sm" title="Arwign Plus — briefings, SMS & automation"
                  style={{ borderColor: 'rgba(var(--gold-rgb),0.5)', color: 'var(--gold-dark)' }}>
                  <Sparkles size={15} /> <span className="hidden sm:inline">Plus</span>
                </button>
                <button onClick={() => setDraft(blankDraft(cursor))} className="btn-primary px-3 py-2 text-sm"><Plus size={15} /> New</button>
                <input ref={fileRef} type="file" accept=".ics,text/calendar" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importICS(f); e.currentTarget.value = '' }} />
              </div>
            </div>

            {/* Quick add */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <Plus size={15} style={{ color: 'var(--gold)' }} />
              <input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitQuick() }}
                placeholder='Quick add — "Lunch with Sara tomorrow 1pm at Java for 45m", "Standup every weekday 9am"'
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              <span className="hidden lg:block text-[11px]" style={{ color: 'var(--text-muted)' }}>⌘K · N new · T today</span>
            </div>

            <div className="flex items-start gap-5">
             <div className="min-w-0 flex-1">
            {/* Body */}
            {needsSetup ? <SetupNotice /> : loading ? (
              <div className="flex items-center justify-center py-24" style={{ color: 'var(--text-muted)' }}><Loader2 size={22} className="animate-spin" /></div>
            ) : view === 'month' ? (
              <MonthView cursor={cursor} weekStart={weekStart} occs={occs} DOW={DOW} compact={compact} onNewDay={(d) => setDraft(blankDraft(d))} onOpen={openOcc} />
            ) : view === 'week' ? (
              <TimeGrid days={7} cursor={cursor} weekStart={weekStart} occs={occs} DOW={DOW} onNewAt={(d, h) => setDraft(blankDraft(d, h))} onOpen={openOcc} />
            ) : view === 'day' ? (
              <TimeGrid days={1} cursor={cursor} weekStart={weekStart} occs={occs} DOW={DOW} onNewAt={(d, h) => setDraft(blankDraft(d, h))} onOpen={openOcc} />
            ) : view === 'year' ? (
              <YearView cursor={cursor} weekStart={weekStart} occs={occs} onPickDay={(d) => { setCursor(d); setView('day') }} />
            ) : (
              <AgendaView cursor={cursor} occs={occs} onOpen={openOcc} onNew={() => setDraft(blankDraft(cursor))} />
            )}
             </div>

              {/* Static, scrollable "Today" rail — right side (desktop) */}
              <aside className="hidden lg:block lg:w-[360px] lg:flex-shrink-0 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border shadow-glass-md"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }} aria-label="Today">
                <TodayRail occs={todayOccs} onOpen={openOcc} onOpenPlus={() => setPlusOpen(true)} />
              </aside>
            </div>
          </div>
        </div>
      </div>

      {draft && (
        <EventModal draft={draft} settings={settings} onChange={setDraft} onClose={() => setDraft(null)} onSave={saveDraft} onDelete={deleteDraft} />
      )}
      {scopeAsk && <ScopeDialog mode={scopeAsk.mode} onPick={scopeAsk.run} onClose={() => setScopeAsk(null)} />}
      <PlusPanel open={plusOpen} onClose={() => setPlusOpen(false)} />
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          occs={occs}
          actions={{
            newEvent: () => { setPaletteOpen(false); setDraft(blankDraft(cursor)) },
            today: () => { setPaletteOpen(false); goToday() },
            setView: (v) => { setPaletteOpen(false); setView(v) },
            openOcc: (o) => { setPaletteOpen(false); openOcc(o) },
            importICS: () => { setPaletteOpen(false); fileRef.current?.click() },
            exportICS: () => { setPaletteOpen(false); exportICS() },
          }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Views
// ══════════════════════════════════════════════════════════════
function occsOnDay(occs: Occ[], day: Date): Occ[] {
  const s = startOfDay(day).getTime(), e = addDays(startOfDay(day), 1).getTime()
  return occs.filter((o) => o.start.getTime() < e && o.end.getTime() > s)
    .sort((a, b) => (Number(b.ev.all_day) - Number(a.ev.all_day)) || (a.start.getTime() - b.start.getTime()))
}

function MonthView({ cursor, weekStart, occs, DOW, compact, onNewDay, onOpen }: {
  cursor: Date; weekStart: number; occs: Occ[]; DOW: string[]; compact: boolean; onNewDay: (d: Date) => void; onOpen: (o: Occ) => void
}) {
  const start = startOfWeek(startOfMonth(cursor), weekStart)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const cap = compact ? 2 : 3
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="grid grid-cols-7">
        {DOW.map((d) => <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const list = occsOnDay(occs, day)
          return (
            <div key={i} onClick={() => onNewDay(day)}
              className={`${compact ? 'min-h-[78px]' : 'min-h-[104px]'} border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-black/[0.02]`}
              style={{ borderColor: 'var(--border)', opacity: inMonth ? 1 : 0.45 }}>
              <div className="flex justify-end">
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                  style={isToday(day) ? { background: 'var(--gold)', color: 'white' } : { color: 'var(--text-secondary)' }}>{day.getDate()}</span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {list.slice(0, cap).map((o) => (
                  <button key={o.key} onClick={(e) => { e.stopPropagation(); onOpen(o) }}
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight truncate"
                    style={{ background: COLOURS[resolveColour(o.ev)]?.soft ?? COLOURS.brass.soft, color: 'var(--text-primary)' }}>
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: COLOURS[resolveColour(o.ev)]?.dot ?? COLOURS.brass.dot }} />
                    {!o.ev.all_day && <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtTime(o.start)}</span>}
                    <span className="truncate">{o.ev.title}</span>
                    {o.isRecurring && <Repeat size={9} className="flex-shrink-0 opacity-60" />}
                  </button>
                ))}
                {list.length > cap && <div className="px-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>+{list.length - cap} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const HOUR_H = 44
function TimeGrid({ days, cursor, weekStart, occs, DOW, onNewAt, onOpen }: {
  days: 1 | 7; cursor: Date; weekStart: number; occs: Occ[]; DOW: string[]; onNewAt: (d: Date, h: number) => void; onOpen: (o: Occ) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H }, [])
  const gridStart = days === 7 ? startOfWeek(cursor, weekStart) : startOfDay(cursor)
  const list = Array.from({ length: days }, (_, i) => addDays(gridStart, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const cols = `48px repeat(${days}, 1fr)`
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div className="border-b border-r" style={{ borderColor: 'var(--border)' }} />
        {list.map((d, i) => (
          <div key={i} className="border-b border-r py-2 text-center" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{DOW[days === 7 ? i : (d.getDay() - weekStart + 7) % 7]}</div>
            <div className="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium"
              style={isToday(d) ? { background: 'var(--gold)', color: 'white' } : { color: 'var(--text-primary)' }}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="grid border-b" style={{ gridTemplateColumns: cols, borderColor: 'var(--border)' }}>
        <div className="py-1 pr-1 text-right text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>All-day</div>
        {list.map((d, i) => (
          <div key={i} className="min-h-[26px] border-r p-0.5" style={{ borderColor: 'var(--border)' }}>
            {occsOnDay(occs, d).filter((o) => o.ev.all_day).map((o) => (
              <button key={o.key} onClick={() => onOpen(o)} className="mb-0.5 block w-full truncate rounded px-1 text-[10px]"
                style={{ background: COLOURS[resolveColour(o.ev)]?.soft, color: 'var(--text-primary)' }}>{o.ev.title}</button>
            ))}
          </div>
        ))}
      </div>
      <div ref={scrollRef} className="max-h-[560px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="relative border-r text-right" style={{ height: HOUR_H, borderColor: 'var(--border)' }}>
                <span className="absolute -top-1.5 right-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>{h === 0 ? '' : `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`}</span>
              </div>
            ))}
          </div>
          {list.map((day, di) => {
            const timed = occsOnDay(occs, day).filter((o) => !o.ev.all_day)
            return (
              <div key={di} className="relative border-r" style={{ borderColor: 'var(--border)' }}>
                {hours.map((h) => <div key={h} onClick={() => onNewAt(day, h)} className="border-b transition-colors hover:bg-black/[0.02]" style={{ height: HOUR_H, borderColor: 'var(--border)' }} />)}
                {timed.map((o) => {
                  const dayStart = startOfDay(day)
                  const top = Math.max(0, ((o.start.getTime() - dayStart.getTime()) / 3.6e6) * HOUR_H)
                  const bottom = Math.min(24 * HOUR_H, ((o.end.getTime() - dayStart.getTime()) / 3.6e6) * HOUR_H)
                  const height = Math.max(16, bottom - top)
                  return (
                    <button key={o.key} onClick={(ce) => { ce.stopPropagation(); onOpen(o) }}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1 py-0.5 text-left text-[10px] leading-tight"
                      style={{ top, height, background: COLOURS[resolveColour(o.ev)]?.soft, borderLeft: `3px solid ${COLOURS[resolveColour(o.ev)]?.dot}`, color: 'var(--text-primary)' }}>
                      <div className="truncate font-medium">{o.ev.title}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{fmtTime(o.start)}</div>
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

function AgendaView({ cursor, occs, onOpen, onNew }: { cursor: Date; occs: Occ[]; onOpen: (o: Occ) => void; onNew: () => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Occ[]>()
    for (let d = startOfDay(cursor); d < addDays(startOfDay(cursor), 30); d = addDays(d, 1)) {
      const list = occsOnDay(occs, d)
      if (list.length) map.set(ymd(d), list)
    }
    return Array.from(map.entries())
  }, [occs, cursor])
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
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(d)}{isToday(d) ? ' · Today' : ''}</span>
            </div>
            <div className="space-y-1.5">
              {list.map((o) => (
                <button key={o.key} onClick={() => onOpen(o)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-black/[0.03]">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: COLOURS[resolveColour(o.ev)]?.dot }} />
                  <span className="w-24 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>{o.ev.all_day ? 'All day' : `${fmtTime(o.start)}–${fmtTime(o.end)}`}</span>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{o.ev.title}</span>
                  {o.isRecurring && <Repeat size={12} className="opacity-50" style={{ color: 'var(--text-muted)' }} />}
                  {o.ev.location && <span className="hidden sm:flex items-center gap-1 text-xs truncate" style={{ color: 'var(--text-muted)' }}><MapPin size={11} /> {o.ev.location}</span>}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function YearView({ cursor, weekStart, occs, onPickDay }: { cursor: Date; weekStart: number; occs: Occ[]; onPickDay: (d: Date) => void }) {
  const year = cursor.getFullYear()
  const busy = useMemo(() => {
    const s = new Set<string>()
    occs.forEach((o) => s.add(ymd(o.start)))
    return s
  }, [occs])
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1)
        const start = startOfWeek(first, weekStart)
        const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
        return (
          <div key={m} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{MONTHS[m]}</p>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[9px]" style={{ color: 'var(--text-muted)' }}>
              {dowLabels(weekStart).map((d) => <div key={d}>{d[0]}</div>)}
              {days.map((day, i) => {
                const inMonth = day.getMonth() === m
                const has = busy.has(ymd(day))
                return (
                  <button key={i} onClick={() => onPickDay(day)}
                    className="relative flex h-5 items-center justify-center rounded"
                    style={{ opacity: inMonth ? 1 : 0.3, background: isToday(day) ? 'var(--gold)' : 'transparent', color: isToday(day) ? '#fff' : 'var(--text-secondary)' }}>
                    {day.getDate()}
                    {has && !isToday(day) && <span className="absolute bottom-0 h-1 w-1 rounded-full" style={{ background: 'var(--gold)' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Sidebar pieces
// ══════════════════════════════════════════════════════════════
function SideLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/[0.04]" style={{ color: 'var(--text-secondary)' }}>
      {icon} {label}
    </Link>
  )
}

// Right-hand "Today" rail: a live Daily Outlook Briefing + agenda for today.
function TodayRail({ occs, onOpen, onOpenPlus }: { occs: Occ[]; onOpen: (o: Occ) => void; onOpenPlus: () => void }) {
  const now = new Date()
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const timed = occs.filter((o) => !o.ev.all_day)
  const allDay = occs.filter((o) => o.ev.all_day)
  const next = timed.find((o) => o.end >= now)
  const clash = new Set<string>()
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
    if (timed[i].start < timed[j].end && timed[j].start < timed[i].end) { clash.add(timed[i].key); clash.add(timed[j].key) }
  }
  const conflicts = clash.size / 2

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
        <div>
          <p className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Today</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{dateLabel}</p>
        </div>
        <button onClick={onOpenPlus} className="btn-outline ml-auto px-2.5 py-1.5 text-xs" style={{ borderColor: 'rgba(var(--gold-rgb),0.5)', color: 'var(--gold-dark)' }}>
          <Sparkles size={13} /> Plus
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        {/* Daily briefing headline */}
        <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'var(--bg-card)' }}>
          <div className="mb-1.5 flex items-center gap-2">
            <Bell size={14} style={{ color: 'var(--gold)' }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.08em' }}>Daily briefing</span>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {occs.length === 0
              ? 'No events today — enjoy the open space.'
              : `${occs.length} event${occs.length > 1 ? 's' : ''} today${conflicts ? ` · ${conflicts} conflict${conflicts > 1 ? 's' : ''} to resolve` : ''}.`}
          </p>
          {next && (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Up next: <strong style={{ color: 'var(--text-primary)' }}>{next.ev.title}</strong> at {fmtTime(next.start)}
            </p>
          )}
        </div>

        {allDay.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allDay.map((o) => (
              <button key={o.key} onClick={() => onOpen(o)} className="rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{o.ev.title}</button>
            ))}
          </div>
        )}

        {timed.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-1 text-3xl" aria-hidden>🌿</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing scheduled. A good day for focus.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {timed.map((o) => {
              const isNow = o.start <= now && now <= o.end
              const isNext = next != null && o.key === next.key && !isNow
              return (
                <button key={o.key} onClick={() => onOpen(o)}
                  className="flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <span className="mt-0.5 h-8 w-1 flex-shrink-0 rounded-full" style={{ background: COLOURS[resolveColour(o.ev)]?.dot || 'var(--gold)' }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{fmtTime(o.start)}</span>
                      {isNow && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white" style={{ background: 'var(--gold)' }}>Now</span>}
                      {isNext && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: 'rgba(var(--gold-rgb),0.16)', color: 'var(--gold-dark)' }}>Next</span>}
                      {clash.has(o.key) && <span className="text-[10px] font-semibold" style={{ color: '#B4664A' }}>⚠ Clash</span>}
                    </div>
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{o.ev.title}</p>
                    {o.ev.location && (
                      <p className="flex items-center gap-1 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}><MapPin size={10} /> {o.ev.location}</p>
                    )}
                  </div>
                  {o.ev.conferencing && <Video size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />}
                </button>
              )
            })}
          </div>
        )}

        <button onClick={onOpenPlus} className="w-full text-center text-xs font-semibold" style={{ color: 'var(--gold)' }}>
          Briefing, SMS &amp; automation settings →
        </button>
      </div>
    </div>
  )
}

function WorldClocks({ zones }: { zones: string[] }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])
  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}><Globe2 size={12} /> World clock</p>
      <div className="space-y-1">
        {zones.map((z) => {
          let label = z.split('/').pop()?.replace(/_/g, ' ') ?? z
          let time = ''
          try { time = new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit' }).format(now) } catch { time = '—' }
          return (
            <div key={z} className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="truncate">{label}</span>
              <span className="font-mono">{time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Theme menu
// ══════════════════════════════════════════════════════════════
function ThemeMenu({ theme, onTheme, compact, onDensity }: {
  theme: CalendarSettings['theme']; onTheme: (t: CalendarSettings['theme']) => void; compact: boolean; onDensity: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-ghost" title="Appearance"><Palette size={16} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border p-2 shadow-glass-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Theme</p>
            {(['light', 'warm', 'dark'] as const).map((t) => (
              <button key={t} onClick={() => { onTheme(t); setOpen(false) }} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm capitalize hover:bg-black/[0.04]" style={{ color: 'var(--text-primary)' }}>
                <span className="flex items-center gap-2">{t === 'dark' ? <Moon size={14} /> : t === 'warm' ? <Palette size={14} /> : <Sun size={14} />} {t}</span>
                {theme === t && <Check size={14} style={{ color: 'var(--gold)' }} />}
              </button>
            ))}
            <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
            <button onClick={() => { onDensity(); setOpen(false) }} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-black/[0.04]" style={{ color: 'var(--text-primary)' }}>
              Density <span style={{ color: 'var(--text-muted)' }}>{compact ? 'Compact' : 'Comfortable'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Command palette
// ══════════════════════════════════════════════════════════════
function CommandPalette({ onClose, occs, actions }: {
  onClose: () => void; occs: Occ[]
  actions: { newEvent: () => void; today: () => void; setView: (v: View) => void; openOcc: (o: Occ) => void; importICS: () => void; exportICS: () => void }
}) {
  const [q, setQ] = useState('')
  const base = [
    { id: 'new', label: 'New event', run: actions.newEvent },
    { id: 'today', label: 'Go to today', run: actions.today },
    { id: 'day', label: 'View: Day', run: () => actions.setView('day') },
    { id: 'week', label: 'View: Week', run: () => actions.setView('week') },
    { id: 'month', label: 'View: Month', run: () => actions.setView('month') },
    { id: 'agenda', label: 'View: Agenda', run: () => actions.setView('agenda') },
    { id: 'year', label: 'View: Year', run: () => actions.setView('year') },
    { id: 'import', label: 'Import .ics file', run: actions.importICS },
    { id: 'export', label: 'Export .ics file', run: actions.exportICS },
  ]
  const ql = q.trim().toLowerCase()
  const cmds = ql ? base.filter((c) => c.label.toLowerCase().includes(ql)) : base
  const events = ql ? occs.filter((o) => o.ev.title.toLowerCase().includes(ql)).slice(0, 6) : []
  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]" style={{ background: 'rgba(20,16,10,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border shadow-glass-lg overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <Command size={16} style={{ color: 'var(--gold)' }} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command or search events…"
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (events[0] ? () => actions.openOcc(events[0]) : cmds[0]?.run)?.() } if (e.key === 'Escape') onClose() }} />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {cmds.map((c) => (
            <button key={c.id} onClick={c.run} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[0.05]" style={{ color: 'var(--text-primary)' }}>{c.label}</button>
          ))}
          {events.length > 0 && <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Events</p>}
          {events.map((o) => (
            <button key={o.key} onClick={() => actions.openOcc(o)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[0.05]" style={{ color: 'var(--text-primary)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: COLOURS[resolveColour(o.ev)]?.dot }} />
              <span className="truncate">{o.ev.title}</span>
              <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{ymd(o.start)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Scope dialog (recurring edit/delete)
// ══════════════════════════════════════════════════════════════
function ScopeDialog({ mode, onPick, onClose }: { mode: 'edit' | 'delete'; onPick: (s: 'this' | 'all') => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(20,16,10,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{mode === 'delete' ? 'Delete recurring event' : 'Edit recurring event'}</p>
        <div className="space-y-2">
          <button onClick={() => onPick('this')} className="btn-outline w-full justify-center py-2 text-sm">This event only</button>
          <button onClick={() => onPick('all')} className="btn-primary w-full justify-center py-2 text-sm">All events in the series</button>
          <button onClick={onClose} className="w-full py-2 text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Event modal
// ══════════════════════════════════════════════════════════════
const inp: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }

function EventModal({ draft, settings, onChange, onClose, onSave, onDelete }: {
  draft: Draft; settings: CalendarSettings; onChange: (d: Draft) => void; onClose: () => void; onSave: () => void; onDelete: () => void
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
  const [tagInput, setTagInput] = useState('')
  const rule = parseRRule(draft.rrule)

  // recurrence preset select
  const presetValue = (() => {
    if (!rule) return 'none'
    if (rule.freq === 'DAILY' && rule.interval === 1) return 'daily'
    if (rule.freq === 'WEEKLY' && rule.byday?.join(',') === 'MO,TU,WE,TH,FR') return 'weekdays'
    if (rule.freq === 'WEEKLY' && rule.interval === 1 && !rule.byday?.length) return 'weekly'
    if (rule.freq === 'MONTHLY' && rule.interval === 1) return 'monthly'
    if (rule.freq === 'YEARLY' && rule.interval === 1) return 'yearly'
    return 'custom'
  })()
  const setPreset = (v: string) => {
    if (v === 'none') return set({ rrule: null })
    if (v === 'daily') return set({ rrule: 'RRULE:FREQ=DAILY' })
    if (v === 'weekly') return set({ rrule: 'RRULE:FREQ=WEEKLY' })
    if (v === 'weekdays') return set({ rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' })
    if (v === 'monthly') return set({ rrule: 'RRULE:FREQ=MONTHLY' })
    if (v === 'yearly') return set({ rrule: 'RRULE:FREQ=YEARLY' })
    if (v === 'custom') return set({ rrule: draft.rrule ?? 'RRULE:FREQ=WEEKLY;INTERVAL=2' })
  }
  const patchRule = (patch: Partial<RRule>) => {
    const base = parseRRule(draft.rrule) ?? { freq: 'WEEKLY', interval: 1 }
    set({ rrule: buildRRule({ ...base, ...patch }) })
  }
  const toggleByday = (d: Weekday) => {
    const base = parseRRule(draft.rrule) ?? { freq: 'WEEKLY', interval: 1 }
    const cur = new Set(base.byday ?? [])
    cur.has(d) ? cur.delete(d) : cur.add(d)
    set({ rrule: buildRRule({ ...base, freq: 'WEEKLY', byday: WEEKDAYS.filter((w) => cur.has(w)) as Weekday[] }) })
  }

  const addTag = () => { const t = tagInput.trim(); if (t && !draft.tags.includes(t)) set({ tags: [...draft.tags, t] }); setTagInput('') }
  const addReminder = (minutes: number) => {
    if (draft.reminders.some((r) => r.minutes === minutes)) return
    set({ reminders: [...draft.reminders, { minutes, channel: 'push' as ReminderChannel }] })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(20,16,10,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border p-5 shadow-glass-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{draft.id ? 'Edit event' : 'New event'}</h3>
          <button onClick={onClose} className="btn-ghost" aria-label="Close"><X size={18} /></button>
        </div>

        <input autoFocus value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Add a title"
          className="mb-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2" style={inp} />

        <label className="mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={draft.allDay} onChange={(e) => set({ allDay: e.target.checked })} className="accent-[#A0830E]" /> All day
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

        {/* Recurrence */}
        <div className="mb-3">
          <span className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}><Repeat size={12} /> Repeat</span>
          <select value={presetValue} onChange={(e) => setPreset(e.target.value)} className="w-full rounded-lg border px-2 py-1.5 text-sm" style={inp}>
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="weekdays">Every weekday (Mon–Fri)</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom…</option>
          </select>
          {presetValue === 'custom' && rule && (
            <div className="mt-2 space-y-2 rounded-lg border p-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Every
                <input type="number" min={1} value={rule.interval} onChange={(e) => patchRule({ interval: Math.max(1, +e.target.value) })} className="w-14 rounded border px-1 py-0.5" style={inp} />
                <select value={rule.freq} onChange={(e) => patchRule({ freq: e.target.value as RRule['freq'] })} className="rounded border px-1 py-0.5" style={inp}>
                  <option value="DAILY">days</option><option value="WEEKLY">weeks</option><option value="MONTHLY">months</option><option value="YEARLY">years</option>
                </select>
              </div>
              {rule.freq === 'WEEKLY' && (
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => {
                    const on = rule.byday?.includes(d)
                    return <button key={d} onClick={() => toggleByday(d)} className="h-7 w-8 rounded text-[11px]" style={{ background: on ? 'var(--gold)' : 'transparent', color: on ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>{d.slice(0, 1)}</button>
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Ends after
                <input type="number" min={1} value={rule.count ?? ''} placeholder="∞" onChange={(e) => patchRule({ count: e.target.value ? +e.target.value : undefined })} className="w-16 rounded border px-1 py-0.5" style={inp} /> times
              </div>
            </div>
          )}
          {rule && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{describeRRule(rule)}</p>}
        </div>

        {/* Reminders */}
        <div className="mb-3">
          <span className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}><Bell size={12} /> Reminders</span>
          <div className="mb-1 flex flex-wrap gap-1.5">
            {draft.reminders.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {describeReminder(r)}
                <button onClick={() => set({ reminders: draft.reminders.filter((_, j) => j !== i) })}><X size={11} /></button>
              </span>
            ))}
          </div>
          <select value="" onChange={(e) => { if (e.target.value) addReminder(+e.target.value) }} className="w-full rounded-lg border px-2 py-1.5 text-sm" style={inp}>
            <option value="">+ Add a reminder…</option>
            {REMINDER_PRESETS.map((p) => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
          </select>
        </div>

        {/* Colour */}
        <div className="mb-3">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Colour</span>
          <div className="flex gap-2">
            {COLOUR_KEYS.map((k) => (
              <button key={k} onClick={() => set({ colour: k })} aria-label={COLOURS[k].label} className="h-7 w-7 rounded-full"
                style={{ background: COLOURS[k].dot, outline: draft.colour === k ? `2px solid var(--text-primary)` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-3">
          <span className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}><TagIcon size={12} /> Tags</span>
          <div className="mb-1 flex flex-wrap gap-1.5">
            {draft.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>
                {t} <button onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })}><X size={11} /></button>
              </span>
            ))}
          </div>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Add tag + Enter"
            className="w-full rounded-lg border px-2 py-1.5 text-sm" style={inp} />
        </div>

        {/* Location + conferencing */}
        <div className="mb-2 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="Location" className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="mb-2 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <Video size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={draft.conferencing} onChange={(e) => set({ conferencing: e.target.value })} placeholder="Video link (Meet / Zoom / Teams)" className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="mb-4 flex items-start gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <AlignLeft size={14} className="mt-1" style={{ color: 'var(--text-muted)' }} />
          <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Notes" rows={2} className="flex-1 resize-none bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        </div>

        <div className="flex items-center justify-between">
          {draft.id ? <button onClick={onDelete} className="inline-flex items-center gap-1 text-sm" style={{ color: '#B4664A' }}><Trash2 size={15} /> Delete</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline px-4 py-2 text-sm">Cancel</button>
            <button onClick={onSave} disabled={!draft.title.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{draft.id ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{icon} {label}</span>
      {children}
    </div>
  )
}

function SetupNotice() {
  return (
    <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <CalendarDays size={30} className="mx-auto mb-3" style={{ color: 'var(--gold)' }} />
      <h3 className="mb-2 font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Calendar setup pending</h3>
      <p className="mx-auto max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
        Apply migrations <code className="mx-1 rounded px-1" style={{ background: 'rgba(160,131,14,0.14)' }}>014</code>,
        <code className="mx-1 rounded px-1" style={{ background: 'rgba(160,131,14,0.14)' }}>015</code> and
        <code className="mx-1 rounded px-1" style={{ background: 'rgba(160,131,14,0.14)' }}>016_calendar_full.sql</code>
        in the Supabase SQL editor, then reload.
      </p>
    </div>
  )
}
