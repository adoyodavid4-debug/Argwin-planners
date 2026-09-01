// lib/calendar/slots.ts — timezone-correct availability slot generation.
// Wall-clock working hours live in the page's IANA zone; we convert to UTC
// instants for comparison against busy intervals (events + existing bookings).
// The model never does date math (masterplan §5.5) — this deterministic engine does.

export interface BookingPageConfig {
  duration_min: number
  buffer_min: number
  min_notice_hours: number
  advance_days: number
  timezone: string
  working_hours: Record<string, [string, string][]> // ISO weekday "1".."7" → [[start,end], …]
}

export interface Interval { start: Date; end: Date }
export interface Slot { startISO: string; endISO: string }

// Minutes to ADD to a UTC instant to get local wall time in `tz` (local = utc + offset).
function offsetMinutes(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = dtf.formatToParts(instant).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a }, {})
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return (asUTC - instant.getTime()) / 60000
}

// The UTC instant for a wall-clock time (y-m-d hh:mm) in `tz`. Refines once to
// handle DST boundaries where the initial offset guess differs.
export function wallTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  let off = offsetMinutes(guess, tz)
  let utc = new Date(guess.getTime() - off * 60000)
  const off2 = offsetMinutes(utc, tz)
  if (off2 !== off) utc = new Date(guess.getTime() - off2 * 60000)
  return utc
}

// ISO weekday (1=Mon … 7=Sun) for a calendar date.
function isoWeekday(y: number, m: number, d: number): string {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=Sun
  return String(((dow + 6) % 7) + 1)
}

function parseHM(s: string): [number, number] {
  const [h, m] = s.split(':').map(Number)
  return [h || 0, m || 0]
}

/**
 * Available slots for a booking page on a given local date (YYYY-MM-DD in the
 * page's timezone), excluding anything that clashes with `busy` intervals
 * (expanded by the page buffer), that's inside the min-notice window, or beyond
 * the advance-booking horizon.
 */
export function generateSlots(cfg: BookingPageConfig, dateStr: string, busy: Interval[], now = new Date()): Slot[] {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return []

  const windows = cfg.working_hours?.[isoWeekday(y, m, d)] ?? []
  const stepMs = cfg.duration_min * 60000
  const bufMs = cfg.buffer_min * 60000
  const minStart = new Date(now.getTime() + cfg.min_notice_hours * 3600000)
  const maxStart = new Date(now.getTime() + cfg.advance_days * 86400000)

  const slots: Slot[] = []
  for (const [startHM, endHM] of windows) {
    const [sh, sm] = parseHM(startHM)
    const [eh, em] = parseHM(endHM)
    const windowStart = wallTimeToUtc(y, m, d, sh, sm, cfg.timezone)
    const windowEnd = wallTimeToUtc(y, m, d, eh, em, cfg.timezone)

    for (let t = windowStart.getTime(); t + stepMs <= windowEnd.getTime() + 1; t += stepMs) {
      const start = new Date(t)
      const end = new Date(t + stepMs)
      if (start < minStart || start > maxStart) continue
      const clashes = busy.some((b) =>
        start.getTime() < b.end.getTime() + bufMs && end.getTime() + bufMs > b.start.getTime()
      )
      if (clashes) continue
      slots.push({ startISO: start.toISOString(), endISO: end.toISOString() })
    }
  }
  return slots
}
