// lib/calendar/moments.ts — Arwign "Moments & Memories": the important dates and
// moments Plus/Teams customers add to their lives (anniversaries, birthdays,
// milestones), the people they share them with, and the celebratory emails sent
// each year. Backs /calendar/plus/moments and /calendar/team/moments and the
// daily cron /api/cron/moment-anniversaries. Data lives in the `moments` and
// `moment_invitees` tables (migration 029).

// ── Types ─────────────────────────────────────────────────────
export type MomentType =
  | 'anniversary' | 'birthday' | 'wedding' | 'milestone' | 'memorial' | 'other'

export interface MomentTypeMeta { value: MomentType; label: string; emoji: string }

// US/UK-friendly occasion labels — never region-specific.
export const MOMENT_TYPES: MomentTypeMeta[] = [
  { value: 'anniversary', label: 'Anniversary', emoji: '💛' },
  { value: 'birthday',    label: 'Birthday',    emoji: '🎂' },
  { value: 'wedding',     label: 'Wedding',     emoji: '💍' },
  { value: 'milestone',   label: 'Milestone',   emoji: '🏆' },
  { value: 'memorial',    label: 'In memory',   emoji: '🕊️' },
  { value: 'other',       label: 'Special day',  emoji: '✨' },
]

export function momentEmoji(type: MomentType): string {
  return (MOMENT_TYPES.find((t) => t.value === type) ?? MOMENT_TYPES[5]).emoji
}
export function momentLabel(type: MomentType): string {
  return (MOMENT_TYPES.find((t) => t.value === type) ?? MOMENT_TYPES[5]).label
}

export interface MomentInvitee {
  id: string
  email: string
  name: string
  notify: boolean
}

export interface Moment {
  id: string
  title: string
  note: string
  type: MomentType
  date: string             // original 'YYYY-MM-DD'
  recurring: boolean
  imageUrl: string | null
  timezone: string
  invitees: MomentInvitee[]
  // derived (see deriveOccurrence)
  nextOccurrenceISO: string // next anniversary date 'YYYY-MM-DD' (or original date if past & one-off)
  yearsAtNext: number       // ordinal years reached at that occurrence (0 for the founding date)
  daysUntil: number         // whole days from today to the occurrence (negative = past one-off)
}

export interface MomentsData {
  live: boolean
  email: string
  timezone: string
  moments: Moment[]
}

// ── Date helpers ──────────────────────────────────────────────
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/**
 * A pure calendar date carries no time; anchoring it at 12:00 UTC keeps the
 * displayed day identical across every US/UK zone (avoids the classic
 * `new Date('2026-09-08')` → "Sept 7 in New_York" off-by-one). Feed the result
 * to lib/calendar/fmt.ts with the user's timezone.
 */
export function momentAnchorISO(dateISO: string): string {
  return `${dateISO}T12:00:00Z`
}

/**
 * Given a moment's founding date, work out the next time it comes around.
 * `now` defaults to the process clock; the cron passes a per-owner local date
 * so the anniversary fires on the right calendar day in the owner's zone.
 */
export function deriveOccurrence(
  dateISO: string,
  recurring: boolean,
  now: Date = new Date(),
): { occurrenceISO: string; years: number; daysUntil: number } {
  const [oy, om, od] = dateISO.split('-').map(Number)
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  let year = now.getUTCFullYear()
  let occ = Date.UTC(year, om - 1, od)
  if (occ < todayUTC && recurring) {
    year += 1
    occ = Date.UTC(year, om - 1, od)
  }
  const daysUntil = Math.round((occ - todayUTC) / 86_400_000)
  const occurrenceISO = new Date(occ).toISOString().slice(0, 10)
  return { occurrenceISO, years: year - oy, daysUntil }
}

// ── Loader ────────────────────────────────────────────────────
// Runs as the signed-in user under RLS — only their own moments come back.
export async function loadMoments(supabase: any): Promise<MomentsData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { live: false, email: '', timezone: 'America/New_York', moments: [] }

  const { data: settings } = await supabase
    .from('calendar_settings')
    .select('timezone')
    .eq('user_id', user.id)
    .maybeSingle()
  const tz = settings?.timezone || 'America/New_York'

  const { data: rows } = await supabase
    .from('moments')
    .select('id, title, note, moment_type, moment_date, recurring, image_url, timezone, moment_invitees(id, email, name, notify)')
    .eq('user_id', user.id)

  const now = new Date()
  const moments: Moment[] = ((rows ?? []) as any[]).map((r) => {
    const d = deriveOccurrence(r.moment_date, r.recurring, now)
    return {
      id: r.id,
      title: r.title,
      note: r.note ?? '',
      type: r.moment_type as MomentType,
      date: r.moment_date,
      recurring: r.recurring,
      imageUrl: r.image_url ?? null,
      timezone: r.timezone ?? tz,
      invitees: ((r.moment_invitees ?? []) as any[]).map((i) => ({
        id: i.id, email: i.email, name: i.name ?? '', notify: i.notify,
      })),
      nextOccurrenceISO: d.occurrenceISO,
      yearsAtNext: d.years,
      daysUntil: d.daysUntil,
    }
  })

  // Soonest upcoming first; past one-offs (negative daysUntil) sink to the end.
  moments.sort((a, b) => {
    const ai = a.daysUntil < 0 ? Number.MAX_SAFE_INTEGER + a.daysUntil : a.daysUntil
    const bi = b.daysUntil < 0 ? Number.MAX_SAFE_INTEGER + b.daysUntil : b.daysUntil
    return ai - bi
  })

  return { live: true, email: user.email ?? '', timezone: tz, moments }
}
