// lib/calendar/recurrence.ts — RFC 5545 RRULE (subset) parsing + expansion.
// Supports FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL, COUNT, UNTIL and BYDAY
// (weekly). Occurrences are expanded from the master event's UTC start; the app
// layer merges detached exceptions (rows with recurrence_parent_id) and applies
// EXDATEs. Fixed-offset zones step exactly in UTC; for DST zones (e.g. US &
// UK) weekly/monthly stepping is within an hour — acceptable for display.

import { addDays, addWeeks, addMonths, addYears } from 'date-fns'
import { fmtDate } from './fmt'

export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export interface RRule {
  freq: Freq
  interval: number
  count?: number
  until?: Date
  byday?: Weekday[]
}

// ── Parse / build ─────────────────────────────────────────────
export function parseRRule(str: string | null | undefined): RRule | null {
  if (!str) return null
  const body = str.replace(/^RRULE:/i, '').trim()
  if (!body) return null
  const parts = Object.fromEntries(
    body.split(';').map((kv) => {
      const [k, v] = kv.split('=')
      return [k.toUpperCase(), (v ?? '').toUpperCase()]
    }),
  )
  const freq = parts.FREQ as Freq
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null
  const rule: RRule = { freq, interval: parts.INTERVAL ? Math.max(1, parseInt(parts.INTERVAL, 10)) : 1 }
  if (parts.COUNT) rule.count = Math.max(1, parseInt(parts.COUNT, 10))
  if (parts.UNTIL) {
    const u = parseICSDate(parts.UNTIL)
    // A date-only UNTIL (YYYYMMDD, no time) is inclusive of that whole day per
    // RFC 5545 §3.3.10. Without this, a same-day timed occurrence (e.g. 09:00 on
    // the UNTIL date) is wrongly dropped because it sorts after 00:00Z.
    if (u) rule.until = /^\d{8}$/.test(parts.UNTIL.trim()) ? new Date(u.getTime() + 86_399_999) : u
  }
  if (parts.BYDAY) {
    rule.byday = parts.BYDAY.split(',')
      .map((d) => d.trim() as Weekday)
      .filter((d) => (WEEKDAYS as readonly string[]).includes(d))
  }
  return rule
}

export function buildRRule(rule: RRule): string {
  const bits = [`FREQ=${rule.freq}`]
  if (rule.interval && rule.interval > 1) bits.push(`INTERVAL=${rule.interval}`)
  if (rule.byday?.length) bits.push(`BYDAY=${rule.byday.join(',')}`)
  if (rule.count) bits.push(`COUNT=${rule.count}`)
  if (rule.until) bits.push(`UNTIL=${toICSDateUTC(rule.until)}`)
  return `RRULE:${bits.join(';')}`
}

// ── Expansion ─────────────────────────────────────────────────
// Cap on occurrences considered *from the fast-forwarded start point* — i.e.
// within/around the requested window, not from the master's creation date. A
// window is at most a year, so this is a generous safety valve, not a horizon.
const HARD_CAP = 1000
const DAY_MS = 86_400_000

// The k-th occurrence, computed ABSOLUTELY from masterStart (not by stepping
// from the previous value). This is what keeps MONTHLY on the 29th–31st from
// drifting: addMonths(Jan 31, 2) is Mar 31, whereas stepping Jan→Feb(28)→Mar
// would clamp to Feb 28 and then never recover to the 31st.
function occurrenceAt(masterStart: Date, freq: Freq, steps: number): Date {
  switch (freq) {
    case 'DAILY':   return addDays(masterStart, steps)
    case 'WEEKLY':  return addWeeks(masterStart, steps)
    case 'MONTHLY': return addMonths(masterStart, steps)
    case 'YEARLY':  return addYears(masterStart, steps)
    default:        return new Date(masterStart)
  }
}

// A safe lower-bound occurrence index whose start is at or just before
// windowStart, so we can jump to the window instead of iterating every
// occurrence since the master's creation (which made long-lived daily events
// silently vanish once they passed ~HARD_CAP occurrences from creation).
function fastForwardIndex(masterStart: Date, rule: RRule, windowStart: Date): number {
  if (windowStart <= masterStart) return 0
  const ms = windowStart.getTime() - masterStart.getTime()
  let est = 0
  switch (rule.freq) {
    case 'DAILY':   est = Math.floor(ms / (DAY_MS * rule.interval)); break
    case 'WEEKLY':  est = Math.floor(ms / (7 * DAY_MS * rule.interval)); break
    case 'YEARLY':  est = Math.floor((windowStart.getUTCFullYear() - masterStart.getUTCFullYear()) / rule.interval); break
    case 'MONTHLY': {
      const months = (windowStart.getUTCFullYear() - masterStart.getUTCFullYear()) * 12
        + (windowStart.getUTCMonth() - masterStart.getUTCMonth())
      est = Math.floor(months / rule.interval)
      break
    }
  }
  return Math.max(0, est - 1) // -1 margin so a boundary occurrence is never skipped
}

/**
 * Occurrence START instants for a recurring master event that fall within
 * [windowStart, windowEnd). `exdates` (original occurrence starts) are skipped.
 * NOTE: stepping is in UTC; for DST zones weekly/monthly occurrences can shift
 * by the DST offset relative to the master's wall-clock time (documented
 * limitation — callers render in the event's zone).
 */
export function expandOccurrences(
  masterStart: Date,
  rule: RRule,
  windowStart: Date,
  windowEnd: Date,
  exdates: Date[] = [],
): Date[] {
  const ex = new Set(exdates.map((d) => d.getTime()))
  const out: Date[] = []

  const push = (d: Date) => {
    if (ex.has(d.getTime())) return
    if (d >= windowStart && d < windowEnd) out.push(new Date(d))
  }

  if (rule.freq === 'WEEKLY' && rule.byday?.length) {
    const dayNums = rule.byday.map((d) => WEEKDAYS.indexOf(d)).sort((a, b) => a - b) // 0=SU..6=SA
    // Sunday of the master's week, at the master's time-of-day.
    const sunday = addDays(masterStart, -masterStart.getUTCDay())
    const masterSunday = new Date(Date.UTC(
      sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(),
      masterStart.getUTCHours(), masterStart.getUTCMinutes(), masterStart.getUTCSeconds(),
    ))
    // Fast-forward to the window (only when unbounded by COUNT — a COUNT rule
    // must be counted from the first occurrence, and is inherently bounded).
    let weekStart = masterSunday
    if (!rule.count && windowStart > masterSunday) {
      const weeks = Math.floor((windowStart.getTime() - masterSunday.getTime()) / (7 * DAY_MS))
      const aligned = Math.max(0, Math.floor(weeks / rule.interval) - 1) * rule.interval
      weekStart = addWeeks(masterSunday, aligned)
    }
    let seen = 0
    while (seen < HARD_CAP) {
      for (const dn of dayNums) {
        const occ = addDays(weekStart, dn)
        if (occ < masterStart) continue
        if (rule.until && occ > rule.until) return out
        push(occ)
        seen++
        if (rule.count && seen >= rule.count) return out
        if (seen >= HARD_CAP) return out
      }
      weekStart = addWeeks(weekStart, rule.interval)
      if (weekStart > windowEnd && !rule.count) break
    }
    return out
  }

  // DAILY / WEEKLY (no byday) / MONTHLY / YEARLY.
  // COUNT rules index from 0 (so the limit is exact); otherwise fast-forward to
  // the window. `k` stays the absolute occurrence index either way.
  let k = rule.count ? 0 : fastForwardIndex(masterStart, rule, windowStart)
  for (let seen = 0; seen < HARD_CAP; k++, seen++) {
    if (rule.count && k >= rule.count) break
    const cur = occurrenceAt(masterStart, rule.freq, rule.interval * k)
    if (rule.until && cur > rule.until) break
    if (cur >= windowEnd) break
    if (cur >= masterStart) push(cur)
  }
  return out
}

// ── ICS date helpers (also used by lib/calendar/ics.ts) ───────
export function toICSDateUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

export function parseICSDate(v: string): Date | null {
  // Forms: 20260115T090000Z | 20260115T090000 | 20260115
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, hh, mm, ss] = m
  if (!hh) return new Date(Date.UTC(+y, +mo - 1, +d))
  return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, ss ? +ss : 0))
}

// Human summary for the UI, e.g. "Every 2 weeks on Mon, Wed".
export function describeRRule(rule: RRule | null, tz?: string): string {
  if (!rule) return 'Does not repeat'
  const n = rule.interval
  const names: Record<Weekday, string> = { SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat' }
  const base =
    rule.freq === 'DAILY' ? (n === 1 ? 'Every day' : `Every ${n} days`)
    : rule.freq === 'WEEKLY' ? (n === 1 ? 'Every week' : `Every ${n} weeks`)
    : rule.freq === 'MONTHLY' ? (n === 1 ? 'Every month' : `Every ${n} months`)
    : (n === 1 ? 'Every year' : `Every ${n} years`)
  const on = rule.byday?.length ? ` on ${rule.byday.map((d) => names[d]).join(', ')}` : ''
  const end = rule.count ? `, ${rule.count} times` : rule.until ? `, until ${fmtDate(rule.until, tz)}` : ''
  return `${base}${on}${end}`
}
