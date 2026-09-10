// lib/calendar/plus.ts — Arwign Plus workspace: types, sample data and a
// resilient loader. Mirrors lib/calendar/team.ts.
//
// Sample data (`sampleWorkspace()`, `live: false`) is only the fallback for
// signed-out/preview contexts. For a signed-in Plus user `loadPlusWorkspace()`
// now hydrates ALL nine sections from real tables: profile/briefing +
// integrations/focus/automation state from `calendar_settings` (migrations
// 019/021), booking pages from `booking_pages`/`bookings` (015/016), meeting
// polls from `meeting_polls`/`poll_options`/`poll_votes` (016), and both the
// calendar-health analytics and the AI scheduling suggestions are derived from
// the user's real `calendar_events` (recurrence expanded via lib/calendar/recurrence).

import { parseRRule, expandOccurrences } from './recurrence'
import { wallTimeToUtc } from './slots'
import { fmtDateTime } from './fmt'

// ── Types ─────────────────────────────────────────────────────
export interface PlusProfile {
  name: string
  email: string
  timezone: string
  plan: 'plus'
  price: string
  renews_on: string // ISO date
}

export interface BriefingConfig {
  email: boolean
  evening: boolean
  hour: number        // 0–23, morning briefing time
  quiet_start: number // 0–23
  quiet_end: number   // 0–23
}

export type IntegrationCategory = 'calendar' | 'conferencing' | 'tasks' | 'crm'
export interface Integration {
  id: string
  name: string
  category: IntegrationCategory
  status: 'connected' | 'available'
  account?: string
  hue: number
  note: string
}

export type SuggestionType = 'reschedule' | 'email-event' | 'time-block' | 'prep' | 'rescue'

// A concrete, enactable change attached to an actionable suggestion. Advisory
// suggestions (rescue, back-to-back) omit it and stay informational. Applied by
// POST /api/calendar/plus/suggestions/apply, which re-derives against live data
// before mutating — it never trusts a stale precomputed target.
export type SuggestionAction =
  | { kind: 'reschedule'; eventId: string; recurring: boolean; occurrenceISO: string }
  | { kind: 'prep'; startISO: string; endISO: string; title: string }

export interface AiSuggestion {
  id: string
  type: SuggestionType
  title: string
  detail: string
  when?: string
  action?: SuggestionAction
}

export type RuleKind = 'focus' | 'boundary' | 'buffer'
export interface FocusRule {
  id: string
  label: string
  kind: RuleKind
  detail: string
  on: boolean
}

export type AutomationKind = 'colour' | 'template' | 'reminder' | 'tag'
export interface AutomationRule {
  id: string
  label: string
  detail: string
  kind: AutomationKind
  on: boolean
}

export interface PersonalBookingPage {
  id: string
  name: string
  slug: string
  duration_min: number
  bookings_30d: number
  active: boolean
}

export interface Poll {
  id: string
  title: string
  options: number
  responses: number
  status: 'open' | 'closed'
}

export interface DayLoad { day: string; meetings: number; focus: number }

export interface PlusAnalytics {
  week: DayLoad[]
  focus_ratio: number
  after_hours: number
  reclaimed_hours: number
  top_sinks: { label: string; hours: number }[]
}

export interface PlusWorkspace {
  live: boolean
  featuresRaw: Record<string, any> // persisted feature/rule/connection state + custom rule arrays (calendar_settings.features)
  profile: PlusProfile
  briefing: BriefingConfig
  integrations: Integration[]
  suggestions: AiSuggestion[]
  focusRules: FocusRule[]
  automationRules: AutomationRule[]
  bookingPages: PersonalBookingPage[]
  polls: Poll[]
  analytics: PlusAnalytics
}

// Namespaced keys under calendar_settings.features that persist Plus state.
export const intKey = (id: string) => `plus.int.${id}`
export const focusKey = (id: string) => `plus.focus.${id}`
export const autoKey = (id: string) => `plus.auto.${id}`

// User-created rules persist as JSON arrays under these dedicated keys (same
// JSONB column; the on/off state of each custom rule still uses autoKey/focusKey
// so custom rules toggle exactly like built-ins).
export const customAutoRulesKey = 'custom_automation_rules'
export const customFocusRulesKey = 'custom_focus_rules'

const AUTO_KINDS: AutomationKind[] = ['colour', 'template', 'reminder', 'tag']
const FOCUS_KINDS: RuleKind[] = ['focus', 'boundary', 'buffer']

export function readCustomAutomationRules(features: Record<string, any>): AutomationRule[] {
  const raw = features?.[customAutoRulesKey]
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r: any) => r && typeof r.id === 'string' && typeof r.label === 'string')
    .map((r: any) => ({
      id: r.id,
      label: r.label,
      detail: typeof r.detail === 'string' ? r.detail : '',
      kind: AUTO_KINDS.includes(r.kind) ? (r.kind as AutomationKind) : 'template',
      on: typeof r.on === 'boolean' ? r.on : true,
    }))
}

export function readCustomFocusRules(features: Record<string, any>): FocusRule[] {
  const raw = features?.[customFocusRulesKey]
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r: any) => r && typeof r.id === 'string' && typeof r.label === 'string')
    .map((r: any) => ({
      id: r.id,
      label: r.label,
      detail: typeof r.detail === 'string' ? r.detail : '',
      kind: FOCUS_KINDS.includes(r.kind) ? (r.kind as RuleKind) : 'focus',
      on: typeof r.on === 'boolean' ? r.on : true,
    }))
}

// ── Colour tokens (mirror the calendar palette) ───────────────
export const PLUS_COLOURS: Record<string, { dot: string; soft: string }> = {
  brass:    { dot: '#A0830E', soft: 'rgba(160,131,14,0.16)' },
  sage:     { dot: '#6E8B7A', soft: 'rgba(110,139,122,0.18)' },
  clay:     { dot: '#B4664A', soft: 'rgba(180,102,74,0.18)' },
  lavender: { dot: '#7B6FAE', soft: 'rgba(123,111,174,0.18)' },
  ocean:    { dot: '#3E7C97', soft: 'rgba(62,124,151,0.18)' },
  rose:     { dot: '#B15B7E', soft: 'rgba(177,91,126,0.18)' },
}

// ── Helpers ───────────────────────────────────────────────────
export const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`
export const byId = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id)

// ── Sample workspace ──────────────────────────────────────────
export function sampleWorkspace(): PlusWorkspace {
  const profile: PlusProfile = {
    name: 'Emma Carter', email: 'emma@arwign.com',
    timezone: 'America/New_York', plan: 'plus', price: '$19.99', renews_on: '2026-10-05',
  }

  const briefing: BriefingConfig = { email: true, evening: true, hour: 7, quiet_start: 21, quiet_end: 7 }

  const integrations: Integration[] = [
    { id: 'i1', name: 'Google Calendar', category: 'calendar', status: 'connected', account: 'emma@gmail.com', hue: 8, note: 'Two-way sync' },
    { id: 'i2', name: 'Microsoft 365 / Outlook', category: 'calendar', status: 'connected', account: 'emma@work.com', hue: 205, note: 'Two-way sync' },
    { id: 'i3', name: 'Apple Calendar (CalDAV)', category: 'calendar', status: 'available', hue: 220, note: 'ICS import / export' },
    { id: 'i4', name: 'Google Meet', category: 'conferencing', status: 'connected', hue: 130, note: 'Auto-attached links' },
    { id: 'i5', name: 'Zoom', category: 'conferencing', status: 'available', hue: 210, note: 'Auto-attached links' },
    { id: 'i6', name: 'Todoist', category: 'tasks', status: 'connected', account: 'Personal', hue: 6, note: 'Tasks → time blocks' },
    { id: 'i7', name: 'Notion', category: 'tasks', status: 'available', hue: 0, note: 'Tasks → time blocks' },
    { id: 'i8', name: 'HubSpot', category: 'crm', status: 'available', hue: 20, note: 'Meetings logged to record' },
  ]

  const suggestions: AiSuggestion[] = [
    { id: 's1', type: 'reschedule', title: 'Resolve a clash at 15:00', detail: 'Move “Team sync” to 16:30 — the least-disruptive shift, everyone still free.', when: 'Today' },
    { id: 's2', type: 'email-event', title: 'Event found in your inbox', detail: '“Dentist, Thu 10:30” detected in an email from Midtown Dental. Add it?', when: 'Thu 10:30' },
    { id: 's3', type: 'time-block', title: 'Protect 2h for the Q4 deck', detail: 'A deadline task from Todoist — slot it Wed 09:00–11:00 as a defended block.', when: 'Wed 09:00' },
    { id: 's4', type: 'prep', title: 'Prep brief ready: Client kickoff', detail: 'Assembled from the agenda, attendee history and last meeting’s notes.', when: '09:00' },
    { id: 's5', type: 'rescue', title: 'This week is overbooked', detail: 'Rescue mode: 2 to decline, 1 to shorten, 1 to delegate — reclaim 3h.', when: 'This week' },
  ]

  const focusRules: FocusRule[] = [
    { id: 'f1', label: 'Deep-work mornings', kind: 'focus', detail: '09:00–11:00 daily — auto-declines meetings, proposes alternates.', on: true },
    { id: 'f2', label: 'No-meeting Fridays', kind: 'boundary', detail: 'Fridays stay clear for focus and catch-up.', on: true },
    { id: 'f3', label: 'Protect my evenings', kind: 'boundary', detail: 'Nothing scheduled after 18:00 without confirmation.', on: true },
    { id: 'f4', label: 'Travel buffers', kind: 'buffer', detail: '15-min buffer before/after off-site meetings, with live “leave now”.', on: true },
    { id: 'f5', label: 'Between-meeting breather', kind: 'buffer', detail: '10-min buffer inserted between back-to-back calls.', on: false },
  ]

  const automationRules: AutomationRule[] = [
    { id: 'a1', label: 'Auto-colour by tag', detail: '“client” → Clay, “focus” → Sage, “personal” → Lavender.', kind: 'colour', on: true },
    { id: 'a2', label: 'Standup template', detail: 'Every weekday 09:00, 15 min, Google Meet auto-attached.', kind: 'template', on: true },
    { id: 'a3', label: 'Layered reminders', detail: '1 day + 30 min before, respecting quiet hours.', kind: 'reminder', on: true },
    { id: 'a4', label: 'Tag from title', detail: 'Titles containing “1:1” get the “people” tag automatically.', kind: 'tag', on: false },
  ]

  const bookingPages: PersonalBookingPage[] = [
    { id: 'b1', name: 'Intro call', slug: 'intro', duration_min: 30, bookings_30d: 18, active: true },
    { id: 'b2', name: 'Coffee chat', slug: 'coffee', duration_min: 45, bookings_30d: 6, active: true },
    { id: 'b3', name: 'Mentoring (paid)', slug: 'mentoring', duration_min: 60, bookings_30d: 3, active: false },
  ]

  const polls: Poll[] = [
    { id: 'pl1', title: 'Dinner with the crew', options: 4, responses: 5, status: 'open' },
    { id: 'pl2', title: 'Podcast recording slot', options: 3, responses: 3, status: 'closed' },
  ]

  const week: DayLoad[] = [
    { day: 'Mon', meetings: 5, focus: 2 },
    { day: 'Tue', meetings: 3, focus: 3 },
    { day: 'Wed', meetings: 6, focus: 1 },
    { day: 'Thu', meetings: 4, focus: 2 },
    { day: 'Fri', meetings: 1, focus: 4 },
  ]

  const analytics: PlusAnalytics = {
    week,
    focus_ratio: 38,
    after_hours: 2,
    reclaimed_hours: 6,
    top_sinks: [
      { label: 'Status meetings', hours: 4.5 },
      { label: 'Recurring syncs', hours: 3 },
      { label: 'Unprepped calls', hours: 2 },
    ],
  }

  return { live: false, featuresRaw: {}, profile, briefing, integrations, suggestions, focusRules, automationRules, bookingPages, polls, analytics }
}

// ── Real-data hydration helpers ───────────────────────────────
// Each loader is independently try/caught so one failing section degrades to its
// own honest empty/zero state (never fake sample numbers on a live workspace).

const DAY_MS = 24 * 3600_000
const ANALYTICS_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] // Sat/Sun fold into after-hours

export interface CalEventRow {
  id: string
  title: string; description?: string | null
  start_at: string; end_at: string; all_day?: boolean | null
  rrule?: string | null; exdates?: string[] | null
  recurrence_parent_id?: string | null
  tags?: string[] | null; event_type?: string | null; colour?: string | null
}
export interface Occurrence {
  start: Date; end: Date; title: string; description: string; focus: boolean
  eventId: string; recurring: boolean
}

// Columns loadCalendarInsights + the apply route both select. Shared so the two
// expansion callers stay in lockstep.
export const CAL_EVENT_COLUMNS =
  'id, title, description, start_at, end_at, all_day, rrule, exdates, recurrence_parent_id, tags, event_type, colour'

const isFocusEvent = (e: CalEventRow): boolean => {
  const t = String(e.title ?? '').toLowerCase()
  return (
    (Array.isArray(e.tags) && e.tags.some((x) => String(x).toLowerCase() === 'focus')) ||
    String(e.event_type ?? '').toLowerCase() === 'focus' ||
    e.colour === 'sage' ||
    /\bfocus\b|deep work/.test(t)
  )
}

// Local weekday (0=Mon…6=Sun) and hour for an instant in an IANA zone. Uses the
// same formatToParts technique as slots.ts (server-side math, not rendered text,
// so the fmt.ts hydration-safety rule doesn't apply here).
function localWeekdayHour(instant: Date, tz: string): { wd: number; hour: number } {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit',
  }).formatToParts(instant).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a }, {})
  const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  let hour = parseInt(p.hour, 10); if (hour === 24) hour = 0
  return { wd: WD[p.weekday] ?? 0, hour: Number.isNaN(hour) ? 0 : hour }
}

// [Monday 00:00, next Monday 00:00) of the week containing `now`, in the user's zone.
function currentWeekWindow(tz: string, now: Date): { start: Date; end: Date } {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const [y, m, d] = ymd.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=Sun…6=Sat
  const sinceMonday = (dow + 6) % 7
  return {
    start: wallTimeToUtc(y, m, d - sinceMonday, 0, 0, tz),
    end: wallTimeToUtc(y, m, d - sinceMonday + 7, 0, 0, tz),
  }
}

// Expand events (incl. recurrence) into concrete timed occurrences in [from, to).
export function expandRange(events: CalEventRow[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = []
  for (const e of events) {
    if (e.all_day) continue
    const s = new Date(e.start_at)
    const durMs = new Date(e.end_at).getTime() - s.getTime()
    if (Number.isNaN(s.getTime()) || durMs <= 0) continue
    const meta = {
      title: e.title || 'Untitled', description: String(e.description ?? ''),
      focus: isFocusEvent(e), eventId: e.id, recurring: !!e.rrule,
    }
    if (e.rrule) {
      const rule = parseRRule(e.rrule)
      if (!rule) continue
      const ex = (e.exdates ?? []).map((x) => new Date(x))
      for (const st of expandOccurrences(s, rule, from, to, ex)) {
        out.push({ start: st, end: new Date(st.getTime() + durMs), ...meta })
      }
    } else if (s >= from && s < to) {
      out.push({ start: s, end: new Date(e.end_at), ...meta })
    }
  }
  return out
}

export interface BusyInterval { start: Date; end: Date }

// Earliest window of length `durMs` that starts at or after `from` and clears
// every `busy` interval, searched up to `horizon`. null if none fits.
// Deterministic — shared by suggestion previews and the apply route's enactment.
export function earliestFreeAfter(busy: BusyInterval[], from: Date, durMs: number, horizon: Date): BusyInterval | null {
  const sorted = busy
    .filter((b) => b.end.getTime() > from.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  let cand = from.getTime()
  for (const b of sorted) {
    if (cand + durMs <= b.start.getTime()) break // fits in the gap before this block
    if (b.end.getTime() > cand) cand = b.end.getTime() // pushed past an overlap
    if (cand >= horizon.getTime()) return null
  }
  if (cand + durMs > horizon.getTime()) return null
  return { start: new Date(cand), end: new Date(cand + durMs) }
}

const hoursOf = (o: Occurrence) => (o.end.getTime() - o.start.getTime()) / 3.6e6
const round1 = (n: number) => Math.round(n * 10) / 10

function buildAnalytics(occ: Occurrence[], tz: string): PlusAnalytics {
  const week: DayLoad[] = ANALYTICS_DAYS.map((day) => ({ day, meetings: 0, focus: 0 }))
  let meetingHours = 0, focusHours = 0, afterHours = 0
  const sinks = new Map<string, number>()

  for (const o of occ) {
    const { wd, hour } = localWeekdayHour(o.start, tz)
    const hrs = hoursOf(o)
    if (o.focus) {
      focusHours += hrs
      if (wd < 5) week[wd].focus += hrs
    } else {
      meetingHours += hrs
      if (wd < 5) week[wd].meetings += 1
      sinks.set(o.title, (sinks.get(o.title) ?? 0) + hrs)
    }
    if (wd >= 5 || hour < 8 || hour >= 18) afterHours += hrs
  }
  week.forEach((w) => { w.focus = round1(w.focus) })

  const denom = meetingHours + focusHours
  return {
    week,
    focus_ratio: denom > 0 ? Math.round((focusHours / denom) * 100) : 0,
    after_hours: round1(afterHours),
    reclaimed_hours: round1(focusHours), // hours actively protected as focus this week
    top_sinks: Array.from(sinks.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([label, hours]) => ({ label, hours: round1(hours) })),
  }
}

// Deterministic scheduling assistant: real suggestions read straight off the
// next 7 days of the user's calendar. Actionable ones (clash → reschedule, prep
// → block) carry an `action` the apply route enacts; advisory ones (rescue,
// back-to-back) don't. Clean calendar → the section honestly shows "inbox zero".
function buildSuggestions(occ: Occurrence[], tz: string, now: Date): AiSuggestion[] {
  const out: AiSuggestion[] = []
  const when = (d: Date) => fmtDateTime(d.toISOString(), tz)
  const horizon = new Date(now.getTime() + 7 * DAY_MS)
  const meetings = occ.filter((o) => !o.focus && o.end.getTime() > now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // 1 — Clashes: move the later meeting to the earliest free slot after the
  //     earlier one ends. Preview the target here; the route re-derives on apply.
  let clashes = 0
  for (let i = 0; i < meetings.length && clashes < 2; i++) {
    for (let j = i + 1; j < meetings.length; j++) {
      const later = meetings[j], earlier = meetings[i]
      if (later.start.getTime() >= earlier.end.getTime()) break
      const durMs = later.end.getTime() - later.start.getTime()
      const busy = occ
        .filter((o) => !(o.eventId === later.eventId && o.start.getTime() === later.start.getTime()))
        .map((o) => ({ start: o.start, end: o.end }))
      const slot = earliestFreeAfter(busy, earlier.end, durMs, horizon)
      out.push({
        id: `clash-${i}-${j}`, type: 'reschedule',
        title: `Resolve a clash: “${later.title}”`,
        detail: slot
          ? `It overlaps “${earlier.title}”. Apply to move it to ${when(slot.start)} — the nearest free slot.`
          : `It overlaps “${earlier.title}”. No free slot in the next 7 days — shorten or decline one.`,
        when: slot ? when(slot.start) : when(later.start),
        action: slot ? { kind: 'reschedule', eventId: later.eventId, recurring: later.recurring, occurrenceISO: later.start.toISOString() } : undefined,
      })
      clashes++
      break
    }
  }

  // 2 — Rescue mode: an overbooked week (advisory — a human call).
  const meetingHours = meetings.reduce((a, o) => a + hoursOf(o), 0)
  if (meetingHours >= 20) {
    out.push({
      id: 'rescue-week', type: 'rescue', title: 'This week looks overbooked',
      detail: `${Math.round(meetingHours)}h of meetings in the next 7 days. Rescue mode can find some to decline, shorten or delegate.`,
      when: 'Next 7 days',
    })
  }

  // 3 — Back-to-back run with no breathing room (advisory — auto-inserting a
  //     buffer would cascade-shift the following meetings).
  for (let i = 0; i + 2 < meetings.length; i++) {
    const gap1 = (meetings[i + 1].start.getTime() - meetings[i].end.getTime()) / 60000
    const gap2 = (meetings[i + 2].start.getTime() - meetings[i + 1].end.getTime()) / 60000
    if (gap1 >= 0 && gap1 <= 5 && gap2 >= 0 && gap2 <= 5) {
      out.push({
        id: 'back-to-back', type: 'time-block',
        title: 'Add a breather to a back-to-back run',
        detail: 'Three or more meetings run with no gap — insert a 10-minute buffer so you can reset between them.',
        when: when(meetings[i].start),
      })
      break
    }
  }

  // 4 — Prep brief: block 25 min before the next meeting that has notes, but
  //     only if that window is free and still in the future.
  const prep = meetings.find((o) => o.description.trim().length > 0)
  if (prep) {
    const prepEnd = prep.start
    const prepStart = new Date(prepEnd.getTime() - 25 * 60000)
    const free = prepStart.getTime() > now.getTime() &&
      !occ.some((o) => o.start.getTime() < prepEnd.getTime() && o.end.getTime() > prepStart.getTime())
    out.push({
      id: 'prep-next', type: 'prep', title: `Prep brief ready: “${prep.title}”`,
      detail: free
        ? `Apply to block 25 min at ${when(prepStart)} to review notes before it starts.`
        : 'Assembled from the event notes — a two-minute read before it starts.',
      when: when(prep.start),
      action: free ? { kind: 'prep', startISO: prepStart.toISOString(), endISO: prepEnd.toISOString(), title: `Prep: ${prep.title}` } : undefined,
    })
  }

  return out.slice(0, 6)
}

async function loadBookingPages(supabase: any, userId: string): Promise<PersonalBookingPage[]> {
  try {
    const { data: pages } = await supabase
      .from('booking_pages')
      .select('id, title, slug, duration_min, is_active')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    if (!pages?.length) return []

    const cutoff = new Date(Date.now() - 30 * DAY_MS).toISOString()
    const { data: bks } = await supabase
      .from('bookings')
      .select('booking_page_id')
      .eq('owner_id', userId).eq('status', 'confirmed').gte('created_at', cutoff)
    const counts = new Map<string, number>()
    for (const b of bks ?? []) counts.set(b.booking_page_id, (counts.get(b.booking_page_id) ?? 0) + 1)

    return pages.map((p: any) => ({
      id: p.id, name: p.title, slug: p.slug, duration_min: p.duration_min,
      bookings_30d: counts.get(p.id) ?? 0, active: !!p.is_active,
    }))
  } catch { return [] }
}

async function loadPolls(supabase: any, userId: string): Promise<Poll[]> {
  try {
    const { data: polls } = await supabase
      .from('meeting_polls')
      .select('id, title, status')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    if (!polls?.length) return []

    const ids = polls.map((p: any) => p.id)
    const [{ data: opts }, { data: votes }] = await Promise.all([
      supabase.from('poll_options').select('poll_id').in('poll_id', ids),
      supabase.from('poll_votes').select('poll_id, voter_name, voter_email').in('poll_id', ids),
    ])
    const optCount = new Map<string, number>()
    for (const o of opts ?? []) optCount.set(o.poll_id, (optCount.get(o.poll_id) ?? 0) + 1)
    // A "response" is a distinct voter, not a distinct vote (voters pick many slots).
    const voters = new Map<string, Set<string>>()
    for (const v of votes ?? []) {
      const key = String(v.voter_email || v.voter_name || '').toLowerCase()
      if (!key) continue
      if (!voters.has(v.poll_id)) voters.set(v.poll_id, new Set())
      voters.get(v.poll_id)!.add(key)
    }
    return polls.map((p: any) => ({
      id: p.id, title: p.title,
      options: optCount.get(p.id) ?? 0,
      responses: voters.get(p.id)?.size ?? 0,
      status: p.status === 'closed' ? 'closed' : 'open',
    }))
  } catch { return [] }
}

async function loadCalendarInsights(
  supabase: any, tz: string, now: Date,
): Promise<{ analytics: PlusAnalytics; suggestions: AiSuggestion[] }> {
  const empty: PlusAnalytics = {
    week: ANALYTICS_DAYS.map((day) => ({ day, meetings: 0, focus: 0 })),
    focus_ratio: 0, after_hours: 0, reclaimed_hours: 0, top_sinks: [],
  }
  try {
    // RLS scopes calendar_events to the signed-in user.
    const { data: events } = await supabase.from('calendar_events').select(CAL_EVENT_COLUMNS)
    const rows: CalEventRow[] = events ?? []

    const wk = currentWeekWindow(tz, now)
    const analytics = buildAnalytics(expandRange(rows, wk.start, wk.end), tz)
    const forward = expandRange(rows, now, new Date(now.getTime() + 7 * DAY_MS))
    const suggestions = buildSuggestions(forward, tz, now)
    return { analytics, suggestions }
  } catch { return { analytics: empty, suggestions: [] } }
}

// ── Real loader with sample fallback ──────────────────────────
// Signed-out / preview → sampleWorkspace() (live:false). Signed-in → every
// section is hydrated from real tables: profile/briefing/integrations/rules from
// calendar_settings, booking pages + polls + calendar-derived analytics and AI
// suggestions from their own tables. The feature *catalog* (labels/details) is
// app-defined via sampleWorkspace(); only the user's *state* and their real
// pages/polls/events drive what shows.
export async function loadPlusWorkspace(supabase: any): Promise<PlusWorkspace> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return sampleWorkspace()

    const base = sampleWorkspace()
    const { data: s } = await supabase.from('calendar_settings').select('*').maybeSingle()
    const settings: Record<string, any> = s ?? {}
    const featuresRaw: Record<string, any> = (settings.features && typeof settings.features === 'object') ? settings.features : {}

    const profile: PlusProfile = {
      ...base.profile,
      name: (user?.user_metadata?.full_name as string) || (user?.email?.split('@')[0] ?? base.profile.name),
      email: user?.email ?? base.profile.email,
      timezone: settings.timezone ?? base.profile.timezone,
    }
    const briefing: BriefingConfig = {
      email: settings.briefing_email ?? true,
      evening: settings.evening_preview ?? false,
      hour: settings.briefing_hour ?? 7,
      quiet_start: settings.quiet_start ?? 21,
      quiet_end: settings.quiet_end ?? 7,
    }
    // Catalog + persisted state. Integrations default to available (no fake accounts).
    const integrations: Integration[] = base.integrations.map((i) => ({
      ...i, account: undefined, status: featuresRaw[intKey(i.id)] ? 'connected' : 'available',
    }))
    // Built-in catalog + user-created rules, each hydrated from its toggle key.
    const focusRules: FocusRule[] = [...base.focusRules, ...readCustomFocusRules(featuresRaw)]
      .map((r) => ({ ...r, on: featuresRaw[focusKey(r.id)] ?? r.on }))
    const automationRules: AutomationRule[] = [...base.automationRules, ...readCustomAutomationRules(featuresRaw)]
      .map((r) => ({ ...r, on: featuresRaw[autoKey(r.id)] ?? r.on }))

    // Real, calendar-derived sections (each degrades to its own empty state).
    const now = new Date()
    const [bookingPages, polls, insights] = await Promise.all([
      loadBookingPages(supabase, user.id),
      loadPolls(supabase, user.id),
      loadCalendarInsights(supabase, profile.timezone, now),
    ])

    return {
      live: true, featuresRaw, profile, briefing, integrations,
      suggestions: insights.suggestions, focusRules, automationRules,
      bookingPages, polls, analytics: insights.analytics,
    }
  } catch {
    return sampleWorkspace()
  }
}
