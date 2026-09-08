import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fmtDateTime } from '@/lib/calendar/fmt'
import {
  expandRange, earliestFreeAfter, CAL_EVENT_COLUMNS,
  type SuggestionAction, type CalEventRow,
} from '@/lib/calendar/plus'

export const dynamic = 'force-dynamic'
const DAY_MS = 24 * 3600_000

// POST /api/calendar/plus/suggestions/apply — enact an AI-scheduling suggestion.
// Runs as the signed-in user (RLS), and RE-DERIVES the change from live data so a
// stale suggestion can never mutate the wrong slot.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const action = body?.action as SuggestionAction | undefined
  if (!action?.kind) return NextResponse.json({ error: 'No action provided.' }, { status: 400 })

  // Busy intervals (recurrence-expanded) for the user in a window.
  const loadBusy = async (from: Date, to: Date) => {
    const { data } = await supabase.from('calendar_events').select(CAL_EVENT_COLUMNS)
    return expandRange((data ?? []) as CalEventRow[], from, to)
  }

  try {
    if (action.kind === 'prep') {
      const start = new Date(action.startISO), end = new Date(action.endISO)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return NextResponse.json({ error: 'Invalid time.' }, { status: 400 })
      }
      if (start.getTime() < Date.now()) return NextResponse.json({ error: 'That prep window is already in the past.' }, { status: 409 })

      const busy = await loadBusy(new Date(start.getTime() - DAY_MS), new Date(end.getTime() + DAY_MS))
      const clash = busy.some((b) => b.start.getTime() < end.getTime() && b.end.getTime() > start.getTime())
      if (clash) return NextResponse.json({ error: 'That slot is no longer free.' }, { status: 409 })

      const { data: s } = await supabase.from('calendar_settings').select('timezone').maybeSingle()
      const tz = s?.timezone ?? 'America/New_York'
      const { error } = await supabase.from('calendar_events').insert({
        user_id: user.id, title: String(action.title).slice(0, 200),
        start_at: start.toISOString(), end_at: end.toISOString(),
        start_tz: tz, colour: 'lavender', tags: ['focus', 'prep'],
      })
      if (error) throw error
      return NextResponse.json({ ok: true, message: `Prep block added at ${fmtDateTime(start.toISOString(), tz)}` })
    }

    if (action.kind === 'reschedule') {
      const { data: ev } = await supabase
        .from('calendar_events')
        .select('id, title, start_at, end_at, start_tz, colour, tags, exdates, rrule')
        .eq('id', action.eventId).maybeSingle()
      if (!ev) return NextResponse.json({ error: 'That event no longer exists.' }, { status: 404 })

      const occStart = new Date(action.occurrenceISO)
      const durMs = new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()
      if (durMs <= 0 || Number.isNaN(occStart.getTime())) return NextResponse.json({ error: 'Invalid event.' }, { status: 400 })
      const occEnd = new Date(occStart.getTime() + durMs)
      const horizon = new Date(occStart.getTime() + 7 * DAY_MS)

      // Everything busy except the very occurrence we're moving.
      const busy = (await loadBusy(new Date(occStart.getTime() - DAY_MS), horizon))
        .filter((b) => !(b.eventId === ev.id && b.start.getTime() === occStart.getTime()))
      const overlaps = busy.filter((b) => b.start.getTime() < occEnd.getTime() && b.end.getTime() > occStart.getTime())
      if (!overlaps.length) return NextResponse.json({ ok: true, message: 'That clash is already resolved.' })

      // Never land in the past if a suggestion is applied hours after it was made.
      const from = new Date(Math.max(Date.now(), ...overlaps.map((b) => b.end.getTime())))
      const slot = earliestFreeAfter(busy.map((b) => ({ start: b.start, end: b.end })), from, durMs, horizon)
      if (!slot) return NextResponse.json({ error: 'No free slot in the next 7 days.' }, { status: 409 })

      if (!action.recurring) {
        const { error } = await supabase.from('calendar_events')
          .update({ start_at: slot.start.toISOString(), end_at: slot.end.toISOString() })
          .eq('id', ev.id)
        if (error) throw error
      } else {
        // Detach just this occurrence: exdate on the master + a standalone row at
        // the new time (mirrors CalendarApp's "this occurrence" edit).
        const exdates = [...((ev.exdates as string[] | null) ?? []), occStart.toISOString()]
        const up = await supabase.from('calendar_events').update({ exdates }).eq('id', ev.id)
        if (up.error) throw up.error
        const ins = await supabase.from('calendar_events').insert({
          user_id: user.id, title: ev.title,
          start_at: slot.start.toISOString(), end_at: slot.end.toISOString(),
          start_tz: ev.start_tz, colour: ev.colour, tags: ev.tags ?? [],
          rrule: null, recurrence_parent_id: ev.id, recurrence_date: occStart.toISOString(),
        })
        if (ins.error) throw ins.error
      }
      return NextResponse.json({ ok: true, message: `Moved to ${fmtDateTime(slot.start.toISOString(), ev.start_tz)}` })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (e) {
    console.error('[plus/suggestions/apply]', e)
    return NextResponse.json({ error: 'Could not apply the change.' }, { status: 500 })
  }
}
