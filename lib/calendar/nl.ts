// lib/calendar/nl.ts — deterministic natural-language event parsing.
// "coffee with Amara Thursday 3pm at Java House for 45m" → structured event.
// No model needed (masterplan §5.4 fields resolved deterministically); an LLM
// can later refine ambiguous input via the same output shape.

export interface ParsedNL {
  title: string
  start: Date
  end: Date
  allDay: boolean
  location: string | null
  rrule: string | null
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5,
  saturday: 6, sat: 6,
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export function parseNaturalLanguage(input: string, now = new Date()): ParsedNL {
  let text = ` ${input.trim()} `
  let allDay = false
  let rrule: string | null = null
  let location: string | null = null

  const strip = (re: RegExp | string) => { text = text.replace(re, ' ') }

  // ── Recurrence ──
  const recur = text.match(/\bevery\s+(day|week|month|year|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun)\b/i)
  if (recur) {
    const w = recur[1].toLowerCase()
    if (w === 'day') rrule = 'RRULE:FREQ=DAILY'
    else if (w === 'week') rrule = 'RRULE:FREQ=WEEKLY'
    else if (w === 'month') rrule = 'RRULE:FREQ=MONTHLY'
    else if (w === 'year') rrule = 'RRULE:FREQ=YEARLY'
    else if (w === 'weekday') rrule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    else {
      const dn = WEEKDAYS[w]
      const code = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][dn]
      rrule = `RRULE:FREQ=WEEKLY;BYDAY=${code}`
    }
    strip(recur[0])
  } else if (/\bdaily\b/i.test(text)) { rrule = 'RRULE:FREQ=DAILY'; strip(/\bdaily\b/i) }
  else if (/\bweekly\b/i.test(text)) { rrule = 'RRULE:FREQ=WEEKLY'; strip(/\bweekly\b/i) }
  else if (/\bmonthly\b/i.test(text)) { rrule = 'RRULE:FREQ=MONTHLY'; strip(/\bmonthly\b/i) }

  // ── All day ──
  if (/\ball[-\s]?day\b/i.test(text)) { allDay = true; strip(/\ball[-\s]?day\b/i) }

  // ── Duration ("for 45m", "for 1.5h", "90 min", "2 hours") ──
  let durationMin: number | null = null
  const dur = text.match(/\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i)
  if (dur) {
    const n = parseFloat(dur[1])
    durationMin = /^h/i.test(dur[2]) ? Math.round(n * 60) : Math.round(n)
    strip(dur[0])
  }

  // ── Base day ──
  let day = startOfDay(now)
  let dayMatched = false
  if (/\btoday\b/i.test(text)) { dayMatched = true; strip(/\btoday\b/i) }
  else if (/\btonight\b/i.test(text)) { dayMatched = true; strip(/\btonight\b/i) }
  else if (/\btomorrow\b/i.test(text) || /\btmrw\b/i.test(text)) { day = addDays(day, 1); dayMatched = true; strip(/\btomorrow\b|\btmrw\b/i) }
  else {
    const wd = text.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thurs|fri|sat)\b/i)
    if (wd) {
      const target = WEEKDAYS[wd[2].toLowerCase()]
      let delta = (target - day.getDay() + 7) % 7
      if (delta === 0) delta = 7 // "monday" means the next one, not today
      if (wd[1]) delta += 0 // "next monday" — same forward search; keep simple
      day = addDays(day, delta)
      dayMatched = true
      strip(wd[0])
    } else {
      // explicit date dd/mm or "15 Jan"
      const dm = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
      if (dm) {
        const dd = +dm[1], mm = +dm[2] - 1, yy = dm[3] ? (dm[3].length === 2 ? 2000 + +dm[3] : +dm[3]) : now.getFullYear()
        day = startOfDay(new Date(yy, mm, dd)); dayMatched = true; strip(dm[0])
      }
    }
  }

  // ── Time ("3pm", "3:30pm", "15:00", "at 9") ──
  let h = 9, min = 0, timeMatched = false
  const tm = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
  if (tm && !allDay) {
    let hh = parseInt(tm[1], 10)
    const mm = tm[2] ? parseInt(tm[2], 10) : 0
    const ap = tm[3]?.toLowerCase()
    const plausible = ap || /\bat\s+\d/i.test(tm[0]) || hh <= 23
    if (plausible && hh <= 23 && mm < 60) {
      if (ap === 'pm' && hh < 12) hh += 12
      if (ap === 'am' && hh === 12) hh = 0
      if (!ap && /tonight/i.test(input) && hh < 12) hh += 12
      h = hh; min = mm; timeMatched = true
      strip(tm[0])
    }
  }

  // ── Location ("at <place>", "@ <place>", "in <place>") ──
  const loc = text.match(/\b(?:at|@|in)\s+([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*){0,3})/)
  if (loc) { location = loc[1].trim(); strip(loc[0]) }

  // ── Title = what's left ──
  const title = text.replace(/\s+/g, ' ').trim() || input.trim()

  const start = new Date(day)
  if (allDay) {
    start.setHours(0, 0, 0, 0)
    const end = addDays(start, 1)
    return { title, start, end, allDay, location, rrule }
  }
  start.setHours(h, min, 0, 0)
  const end = new Date(start.getTime() + (durationMin ?? 60) * 60000)
  return { title, start, end, allDay, location, rrule }
}
