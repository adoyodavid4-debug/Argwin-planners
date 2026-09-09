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
    if (u) rule.until = u
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
const HARD_CAP = 1000 // safety valve against runaway rules

/**
 * Occurrence START instants for a recurring master event that fall within
 * [windowStart, windowEnd). `exdates` (original occurrence starts) are skipped.
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
    const dayNums = rule.byday.map((d) => WEEKDAYS.indexOf(d)) // 0=SU..6=SA
    // Start from the Sunday of the master's week, step by INTERVAL weeks.
    let weekStart = addDays(masterStart, -masterStart.getUTCDay())
    weekStart = new Date(Date.UTC(
      weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate(),
      masterStart.getUTCHours(), masterStart.getUTCMinutes(), masterStart.getUTCSeconds(),
    ))
    let count = 0
    while (count < HARD_CAP) {
      for (const dn of dayNums.slice().sort((a, b) => a - b)) {
        const occ = addDays(weekStart, dn)
        if (occ < masterStart) continue
        if (rule.until && occ > rule.until) return out
        push(occ)
        count++
        if (rule.count && count >= rule.count) return out
        if (occ >= windowEnd) { /* keep going only if before window end */ }
      }
      weekStart = addWeeks(weekStart, rule.interval)
      if (weekStart > windowEnd && (!rule.count)) break
      if (count >= HARD_CAP) break
    }
    return out
  }

  let cur = new Date(masterStart)
  let i = 0
  while (i < HARD_CAP) {
    if (rule.until && cur > rule.until) break
    push(cur)
    i++
    if (rule.count && i >= rule.count) break
    if (cur > windowEnd && !rule.count && !rule.until) break
    switch (rule.freq) {
      case 'DAILY':   cur = addDays(cur, rule.interval); break
      case 'WEEKLY':  cur = addWeeks(cur, rule.interval); break
      case 'MONTHLY': cur = addMonths(cur, rule.interval); break
      case 'YEARLY':  cur = addYears(cur, rule.interval); break
    }
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
