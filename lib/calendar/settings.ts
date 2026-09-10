// lib/calendar/settings.ts — per-user calendar settings: types, defaults, IO.
// Mirrors the calendar_settings table (migration 016). Loading upserts a default
// row on first use so the rest of the app can assume settings always exist.

import { DEFAULT_TZ } from './fmt'

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
  briefing_hour: number
  evening_preview: boolean
  quiet_start: number | null
  quiet_end: number | null
  no_meeting_days: number[]
  protect_after_hour: number | null
  protect_before_hour: number | null
  focus_protect: boolean
  last_evening_on: string | null
  features: Record<string, boolean>
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  '1': [['09:00', '17:00']], '2': [['09:00', '17:00']], '3': [['09:00', '17:00']],
  '4': [['09:00', '17:00']], '5': [['09:00', '17:00']],
}

export function defaultSettings(): CalendarSettings {
  return {
    // US/UK market default — NOT the browser's detected zone, which would persist
    // whatever the visitor/dev machine reports (e.g. Africa/Nairobi). Users change
    // it explicitly in Settings.
    timezone: DEFAULT_TZ,
    week_start: 1,
    working_hours: DEFAULT_WORKING_HOURS,
    theme: 'warm',
    density: 'comfortable',
    default_view: 'month',
    world_clocks: [],
    reminder_defaults: [{ minutes: 30, channel: 'push' }],
    briefing_email: true,
    briefing_hour: 7,
    evening_preview: false,
    quiet_start: null,
    quiet_end: null,
    no_meeting_days: [],
    protect_after_hour: null,
    protect_before_hour: null,
    focus_protect: false,
    last_evening_on: null,
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
