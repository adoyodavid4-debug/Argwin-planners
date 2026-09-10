// lib/calendar/busy.ts — the single source of "when is this user busy" for every
// booking/availability path. Crucially it EXPANDS recurring events (rrule +
// exdates) into concrete occurrences within the window: a raw
// `start_at < end AND end_at > start` filter only catches a recurring master on
// its first occurrence's day, so without this a visitor could book over every
// later occurrence of a weekly/daily meeting. Cancelled events never block.

import { parseRRule, expandOccurrences } from './recurrence'

export interface BusyInterval { start: Date; end: Date }

interface EventRow {
  user_id: string
  start_at: string
  end_at: string
  rrule: string | null
  exdates: string[] | null
  status: string | null
}

/**
 * Busy intervals per user within [windowStart, windowEnd). Recurring events are
 * expanded; non-recurring events (and detached exception rows, which carry no
 * rrule) contribute their own interval when they overlap the window.
 */
export async function busyIntervalsForUsers(
  supabase: any,
  userIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<Map<string, BusyInterval[]>> {
  const byUser = new Map<string, BusyInterval[]>()
  for (const id of userIds) byUser.set(id, [])
  if (userIds.length === 0) return byUser

  const startISO = windowStart.toISOString()
  const endISO = windowEnd.toISOString()

  // Two disjoint sets so no row is counted twice and we avoid fragile
  // PostgREST or() strings:
  //   (a) non-recurring rows that overlap the window (incl. exception rows), and
  //   (b) every recurring master starting before the window ends — its
  //       occurrences may land inside the window even though its master row
  //       (and end_at) sit far in the past.
  const [{ data: direct }, { data: recurring }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('user_id, start_at, end_at, rrule, exdates, status')
      .in('user_id', userIds)
      .is('rrule', null)
      .neq('status', 'cancelled')
      .lt('start_at', endISO)
      .gt('end_at', startISO),
    supabase
      .from('calendar_events')
      .select('user_id, start_at, end_at, rrule, exdates, status')
      .in('user_id', userIds)
      .not('rrule', 'is', null)
      .neq('status', 'cancelled')
      .lt('start_at', endISO),
  ])

  for (const e of (direct ?? []) as EventRow[]) {
    const arr = byUser.get(e.user_id)
    if (!arr) continue
    const s = new Date(e.start_at)
    const en = new Date(e.end_at)
    if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) continue
    arr.push({ start: s, end: en })
  }

  for (const e of (recurring ?? []) as EventRow[]) {
    const arr = byUser.get(e.user_id)
    if (!arr) continue
    const s = new Date(e.start_at)
    const durMs = new Date(e.end_at).getTime() - s.getTime()
    if (Number.isNaN(s.getTime()) || durMs <= 0) continue
    const rule = parseRRule(e.rrule)
    if (!rule) {
      // Unparseable rule — fall back to blocking the master's own interval if it
      // happens to overlap, rather than silently ignoring the event.
      if (s < windowEnd && new Date(e.end_at) > windowStart) arr.push({ start: s, end: new Date(e.end_at) })
      continue
    }
    const ex = (e.exdates ?? []).map((x) => new Date(x))
    for (const st of expandOccurrences(s, rule, windowStart, windowEnd, ex)) {
      arr.push({ start: st, end: new Date(st.getTime() + durMs) })
    }
  }

  return byUser
}

/** Convenience wrapper for a single user. */
export async function busyIntervalsForUser(
  supabase: any,
  userId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<BusyInterval[]> {
  const m = await busyIntervalsForUsers(supabase, [userId], windowStart, windowEnd)
  return m.get(userId) ?? []
}
