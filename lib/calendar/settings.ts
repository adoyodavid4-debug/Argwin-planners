// lib/calendar/settings.ts — per-user calendar settings: types, defaults, IO.
// Mirrors the calendar_settings table (migration 016). Loading upserts a default
// row on first use so the rest of the app can assume settings always exist.

export type Theme = 'light' | 'dark' | 'warm' | 'system'
export type Density = 'comfortable' | 'compact'
export type CalView = 'day' | 'week' | 'month' | 'agenda' | 'year'
export type ReminderChannel = 'push' | 'email' | 'popup'
export interface Reminder { minutes: number; channel: ReminderChannel }
export type WorkingHours = Record<string, [string, string][]> // ISO weekday "1".."7"

export interface CalendarSettings {
  user_id?: string
  timezone: string
  week_start: number
  working_hours: WorkingHours
  theme: Theme
  density: Density
  default_view: CalView
  world_clocks: string[]
  reminder_defaults: Reminder[]
  briefing_email: boolean
  briefing_sms: boolean
  briefing_hour: number
  evening_preview: boolean
  quiet_start: number | null
  quiet_end: number | null
  no_meeting_days: number[]
  focus_protect: boolean
  phone: string | null
  features: Record<string, boolean>
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  '1': [['09:00', '17:00']], '2': [['09:00', '17:00']], '3': [['09:00', '17:00']],
  '4': [['09:00', '17:00']], '5': [['09:00', '17:00']],
}

export function defaultSettings(): CalendarSettings {
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Africa/Nairobi'
  return {
    timezone: tz || 'Africa/Nairobi',
    week_start: 1,
    working_hours: DEFAULT_WORKING_HOURS,
    theme: 'warm',
    density: 'comfortable',
    default_view: 'month',
    world_clocks: [],
    reminder_defaults: [{ minutes: 30, channel: 'push' }],
    briefing_email: true,
    briefing_sms: false,
    briefing_hour: 7,
    evening_preview: false,
    quiet_start: null,
    quiet_end: null,
    no_meeting_days: [],
    focus_protect: false,
    phone: null,
    features: {},
  }
}

// `supabase` is the browser client (typed loosely to avoid a generated-types dep).
export async function loadSettings(supabase: any): Promise<CalendarSettings> {
  const { data, error } = await supabase.from('calendar_settings').select('*').maybeSingle()
  if (error || !data) {
    const seed = defaultSettings()
    try { await supabase.from('calendar_settings').insert(seed) } catch { /* table may not exist yet */ }
    return seed
  }
  return { ...defaultSettings(), ...data }
}

export async function saveSettings(supabase: any, patch: Partial<CalendarSettings>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('calendar_settings').upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
}
