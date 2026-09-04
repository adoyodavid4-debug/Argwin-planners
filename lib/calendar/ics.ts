// lib/calendar/ics.ts — standards-compliant ICS import / export (RFC 5545).
// Export produces a VCALENDAR the user can subscribe to in Apple/Google/Outlook;
// import parses VEVENTs into draft events. This is the credential-free half of
// "ecosystem integration" — real interop without an OAuth app.

import { toICSDateUTC, parseICSDate } from './recurrence'

export interface ICSEventInput {
  id: string
  title: string
  description?: string | null
  location?: string | null
  start_at: string // ISO
  end_at: string   // ISO
  all_day: boolean
  rrule?: string | null
}

export interface ParsedICSEvent {
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string
  all_day: boolean
  rrule: string | null
}

const DOMAIN = 'arwignplanners.com'

function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}
function unesc(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

// Fold long lines at 75 octets per RFC 5545 §3.1.
function fold(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let s = line
  chunks.push(s.slice(0, 75))
  s = s.slice(75)
  while (s.length) { chunks.push(' ' + s.slice(0, 74)); s = s.slice(74) }
  return chunks.join('\r\n')
}

function icsDateOnly(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`
}

export function eventsToICS(events: ICSEventInput[], calName = 'Arwign Calendar'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Arwign//Arwign Calendar//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
  ]
  const stamp = toICSDateUTC(new Date())
  for (const ev of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${ev.id}@${DOMAIN}`)
    lines.push(`DTSTAMP:${stamp}`)
    if (ev.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${icsDateOnly(ev.start_at)}`)
      lines.push(`DTEND;VALUE=DATE:${icsDateOnly(ev.end_at)}`)
    } else {
      lines.push(`DTSTART:${toICSDateUTC(new Date(ev.start_at))}`)
      lines.push(`DTEND:${toICSDateUTC(new Date(ev.end_at))}`)
    }
    lines.push(`SUMMARY:${esc(ev.title)}`)
    if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`)
    if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`)
    if (ev.rrule) lines.push(ev.rrule.startsWith('RRULE:') ? ev.rrule : `RRULE:${ev.rrule}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n')
}

// Unfold folded lines, then parse VEVENT blocks.
export function parseICS(text: string): ParsedICSEvent[] {
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const rawLines = unfolded.split(/\r?\n/)
  const events: ParsedICSEvent[] = []
  let cur: Partial<ParsedICSEvent> & { _allDay?: boolean } | null = null

  for (const line of rawLines) {
    if (line === 'BEGIN:VEVENT') { cur = { description: null, location: null, rrule: null }; continue }
    if (line === 'END:VEVENT') {
      if (cur && cur.title && cur.start_at) {
        if (!cur.end_at) cur.end_at = new Date(new Date(cur.start_at).getTime() + 3600_000).toISOString()
        events.push({
          title: cur.title,
          description: cur.description ?? null,
          location: cur.location ?? null,
          start_at: cur.start_at,
          end_at: cur.end_at,
          all_day: !!cur.all_day,
          rrule: cur.rrule ?? null,
        })
      }
      cur = null
      continue
    }
    if (!cur) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const rawKey = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const key = rawKey.split(';')[0].toUpperCase()
    const isDateOnly = /VALUE=DATE(?![-])/i.test(rawKey)

    switch (key) {
      case 'SUMMARY': cur.title = unesc(value); break
      case 'DESCRIPTION': cur.description = unesc(value); break
      case 'LOCATION': cur.location = unesc(value); break
      case 'DTSTART': {
        const d = parseICSDate(value)
        if (d) { cur.start_at = d.toISOString(); if (isDateOnly) cur.all_day = true }
        break
      }
      case 'DTEND': {
        const d = parseICSDate(value)
        if (d) cur.end_at = d.toISOString()
        break
      }
      case 'RRULE': cur.rrule = `RRULE:${value}`; break
    }
  }
  return events
}
