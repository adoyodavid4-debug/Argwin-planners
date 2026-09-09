// lib/calendar/fmt.ts — hydration-safe date formatting for the calendar UIs.
//
// Two production bugs motivated this helper:
//  1. RangeError crashes: `Intl.DateTimeFormat.format(new Date(''))` throws when
//     a nullable DB timestamp (e.g. teams.renews_on) reaches the UI as '' / null.
//  2. React #425 hydration mismatches: formatting without an explicit timeZone
//     renders in the server's zone (UTC on Vercel) but the visitor's zone in the
//     browser, so the SSR text never matches the client text.
//
// Always returns a deterministic string: an em dash for missing/invalid input,
// otherwise the date formatted in the given IANA zone (defaults to the US/UK
// market default, America/New_York).

const DEFAULT_TZ = 'America/New_York'

// Accepts Dates as well as ISO strings: callers holding a Date must not round-trip
// via .toISOString(), which itself throws RangeError on an Invalid Date.
type DateInput = string | Date | null | undefined

function safeFormat(input: DateInput, opts: Intl.DateTimeFormatOptions, tz?: string): string {
  if (!input) return '—'
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: tz || DEFAULT_TZ }).format(d)
  } catch {
    // e.g. an invalid IANA zone string stored in the DB
    return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: DEFAULT_TZ }).format(d)
  }
}

/** "8 Sept 2026" — for date-only values (renewal dates, since-dates). */
export const fmtDate = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { day: 'numeric', month: 'short', year: 'numeric' }, tz)

/** "8 Sept, 11:56 am" — for timestamps (audit log, bookings). */
export const fmtDateTime = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }, tz)

/** "8 September 2026" — long form for billing/renewal copy. */
export const fmtDateLong = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { day: 'numeric', month: 'long', year: 'numeric' }, tz)

/** "11:56 am" — time only. */
export const fmtTime = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { hour: 'numeric', minute: '2-digit', hour12: true }, tz)

/** "Tue, 8 Sept 2026, 11:56 am" — full timestamp for emails/notifications. */
export const fmtWhen = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }, tz)

/** "Tuesday" — weekday name (agenda group headers). */
export const fmtWeekday = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { weekday: 'long' }, tz)

/** "Tuesday 8 September" — day-view / Today-rail headings. */
export const fmtDayTitle = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { weekday: 'long', day: 'numeric', month: 'long' }, tz)

/** "23:56" — 24-hour clock (world-clock rail). */
export const fmtClock = (iso: DateInput, tz?: string) =>
  safeFormat(iso, { hour: '2-digit', minute: '2-digit' }, tz)

/** "11:56 am" / "9 am" — fmtTime with a bare ":00" dropped, for dense grids. */
export const fmtTimeShort = (iso: DateInput, tz?: string) =>
  fmtTime(iso, tz).replace(':00', '')
