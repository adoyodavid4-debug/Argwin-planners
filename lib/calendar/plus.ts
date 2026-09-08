// lib/calendar/plus.ts — Arwign Plus workspace: types, sample data and a
// resilient loader. Mirrors lib/calendar/team.ts.
//
// Like the Teams workspace, every Plus section renders fully before any of the
// real tables/settings exist: `loadPlusWorkspace()` returns rich SAMPLE data
// plus `live: false` so the interface is always alive and honest. Plus feature
// toggles ultimately persist to `calendar_settings.features` (migration 019);
// connected integrations and automation/focus rules to migration 021.

// ── Types ─────────────────────────────────────────────────────
export interface PlusProfile {
  name: string
  email: string
  phone: string
  timezone: string
  plan: 'plus'
  price: string
  renews_on: string // ISO date
}

export interface BriefingConfig {
  email: boolean
  sms: boolean
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
export interface AiSuggestion {
  id: string
  type: SuggestionType
  title: string
  detail: string
  when?: string
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
export const phoneValid = (p: string) => /^\+\d{8,15}$/.test((p || '').replace(/[\s()-]/g, ''))
export const byId = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id)

// ── Sample workspace ──────────────────────────────────────────
export function sampleWorkspace(): PlusWorkspace {
  const profile: PlusProfile = {
    name: 'Emma Carter', email: 'emma@arwign.com', phone: '+1 202 555 0134',
    timezone: 'America/New_York', plan: 'plus', price: '$19.99', renews_on: '2026-10-05',
  }

  const briefing: BriefingConfig = { email: true, sms: true, evening: true, hour: 7, quiet_start: 21, quiet_end: 7 }

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

// ── Real loader with sample fallback ──────────────────────────
// Hydrates from the caller's calendar_settings row: briefing + phone from
// columns, and each rule/integration's on/connected state from the `features`
// JSONB (namespaced keys). The feature *catalog* (labels/details) is app-defined
// via sampleWorkspace(); only the user's *state* persists. Booking pages, polls
// and analytics remain sample-derived (read-only insights, not user state).
export async function loadPlusWorkspace(supabase: any): Promise<PlusWorkspace> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    const { data: s } = await supabase.from('calendar_settings').select('*').maybeSingle()
    if (!s) return sampleWorkspace()

    const base = sampleWorkspace()
    const featuresRaw: Record<string, any> = (s.features && typeof s.features === 'object') ? s.features : {}

    const profile: PlusProfile = {
      ...base.profile,
      name: (user?.user_metadata?.full_name as string) || (user?.email?.split('@')[0] ?? base.profile.name),
      email: user?.email ?? base.profile.email,
      phone: s.phone ?? '',
      timezone: s.timezone ?? base.profile.timezone,
    }
    const briefing: BriefingConfig = {
      email: s.briefing_email ?? true,
      sms: s.briefing_sms ?? false,
      evening: s.evening_preview ?? false,
      hour: s.briefing_hour ?? 7,
      quiet_start: s.quiet_start ?? 21,
      quiet_end: s.quiet_end ?? 7,
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

    return {
      live: true, featuresRaw, profile, briefing, integrations,
      suggestions: base.suggestions, focusRules, automationRules,
      bookingPages: base.bookingPages, polls: base.polls, analytics: base.analytics,
    }
  } catch {
    return sampleWorkspace()
  }
}
