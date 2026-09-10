// lib/calendar/templates.ts — Recurring event templates (masterplan Pillar D):
// reusable blueprints ("Weekly 1:1", "Client kickoff") with a preset duration,
// colour, attendees, agenda, conferencing and buffers, applied in one click to
// create a real calendar_event. Backs /calendar/plus/templates and
// /calendar/team/templates. Data lives in the `event_templates` table (migration 030).

export interface EventTemplate {
  id: string
  name: string
  title: string
  description: string
  durationMin: number
  colour: string
  eventType: string | null
  location: string
  conferencing: string
  attendees: string[]
  bufferBeforeMin: number
  bufferAfterMin: number
  tags: string[]
}

export interface TemplatesData {
  live: boolean
  timezone: string
  templates: EventTemplate[]
}

// Matches the calendar colour palette (calendar_events.colour tokens).
export const TEMPLATE_COLOURS = ['brass', 'sage', 'ocean', 'clay', 'lavender', 'honey', 'forest', 'rose']

export const CONFERENCING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No conferencing' },
  { value: 'google-meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
]
export const conferencingLabel = (v: string) =>
  CONFERENCING_OPTIONS.find((o) => o.value === v)?.label ?? 'No conferencing'

function mapRow(r: any): EventTemplate {
  return {
    id: r.id,
    name: r.name,
    title: r.title,
    description: r.description ?? '',
    durationMin: r.duration_min ?? 30,
    colour: r.colour ?? 'brass',
    eventType: r.event_type ?? null,
    location: r.location ?? '',
    conferencing: r.conferencing ?? '',
    attendees: Array.isArray(r.attendees) ? r.attendees : [],
    bufferBeforeMin: r.buffer_before_min ?? 0,
    bufferAfterMin: r.buffer_after_min ?? 0,
    tags: Array.isArray(r.tags) ? r.tags : [],
  }
}

// Runs as the signed-in user under RLS — only their own templates come back.
export async function loadTemplates(supabase: any): Promise<TemplatesData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { live: false, timezone: 'America/New_York', templates: [] }

  const { data: settings } = await supabase
    .from('calendar_settings').select('timezone').eq('user_id', user.id).maybeSingle()
  const tz = settings?.timezone || 'America/New_York'

  const { data: rows } = await supabase
    .from('event_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return { live: true, timezone: tz, templates: ((rows ?? []) as any[]).map(mapRow) }
}
