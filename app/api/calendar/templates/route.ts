import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fmtDateTime } from '@/lib/calendar/fmt'
import { TEMPLATE_COLOURS } from '@/lib/calendar/templates'

export const dynamic = 'force-dynamic'

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)
const clampInt = (v: any, lo: number, hi: number, dflt: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt
}

function fields(body: any) {
  return {
    name: String(body.name ?? '').trim().slice(0, 120),
    title: String(body.title ?? '').trim().slice(0, 200),
    description: String(body.description ?? '').slice(0, 4000),
    duration_min: clampInt(body.durationMin, 5, 1440, 30),
    colour: TEMPLATE_COLOURS.includes(body.colour) ? body.colour : 'brass',
    event_type: body.eventType ? String(body.eventType).slice(0, 40) : null,
    location: String(body.location ?? '').slice(0, 200),
    conferencing: String(body.conferencing ?? '').slice(0, 40),
    attendees: Array.isArray(body.attendees)
      ? Array.from(new Set(body.attendees.map((e: any) => String(e).trim().toLowerCase()).filter(isEmail))).slice(0, 50)
      : [],
    buffer_before_min: clampInt(body.bufferBeforeMin, 0, 240, 0),
    buffer_after_min: clampInt(body.bufferAfterMin, 0, 240, 0),
    tags: Array.isArray(body.tags) ? body.tags.map((t: any) => String(t).slice(0, 40)).slice(0, 20) : [],
    updated_at: new Date().toISOString(),
  }
}

// POST — action-based: create | update | delete | apply.
// Runs as the signed-in user, so RLS confines every write to their own rows.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const action = String(body?.action ?? '')

  try {
    if (action === 'create' || action === 'update') {
      const f = fields(body)
      if (!f.name) return NextResponse.json({ error: 'Give the template a name.' }, { status: 400 })
      if (!f.title) return NextResponse.json({ error: 'The event needs a title.' }, { status: 400 })

      if (action === 'create') {
        const { error } = await supabase.from('event_templates').insert({ ...f, user_id: user.id })
        if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
      } else {
        const id = String(body.id ?? '')
        if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
        const { error } = await supabase.from('event_templates').update(f).eq('id', id).eq('user_id', user.id)
        if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete') {
      const id = String(body.id ?? '')
      if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
      const { error } = await supabase.from('event_templates').delete().eq('id', id).eq('user_id', user.id)
      if (error) return NextResponse.json({ error: 'Could not delete.' }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'apply') {
      const id = String(body.id ?? '')
      const startISO = String(body.startISO ?? '')
      const start = new Date(startISO)
      if (!id) return NextResponse.json({ error: 'Missing template.' }, { status: 400 })
      if (Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Pick a valid start time.' }, { status: 400 })

      const { data: t } = await supabase.from('event_templates').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
      if (!t) return NextResponse.json({ error: 'Template not found.' }, { status: 404 })

      const { data: s } = await supabase.from('calendar_settings').select('timezone').maybeSingle()
      const tz = s?.timezone || 'America/New_York'
      const end = new Date(start.getTime() + (t.duration_min ?? 30) * 60000)

      const rows: any[] = [{
        user_id: user.id,
        title: t.title,
        description: t.description || null,
        location: t.location || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        start_tz: tz,
        colour: t.colour || 'brass',
        event_type: t.event_type || null,
        conferencing: t.conferencing || null,
        tags: Array.isArray(t.tags) ? t.tags : [],
      }]
      // Buffer blocks around the event (own rows, tagged so they read as buffers).
      if ((t.buffer_before_min ?? 0) > 0) {
        rows.push({
          user_id: user.id, title: `Buffer before ${t.title}`,
          start_at: new Date(start.getTime() - t.buffer_before_min * 60000).toISOString(),
          end_at: start.toISOString(), start_tz: tz, colour: 'lavender', tags: ['buffer'],
        })
      }
      if ((t.buffer_after_min ?? 0) > 0) {
        rows.push({
          user_id: user.id, title: `Buffer after ${t.title}`,
          start_at: end.toISOString(),
          end_at: new Date(end.getTime() + t.buffer_after_min * 60000).toISOString(),
          start_tz: tz, colour: 'lavender', tags: ['buffer'],
        })
      }
      const { error } = await supabase.from('calendar_events').insert(rows)
      if (error) return NextResponse.json({ error: 'Could not add to your calendar.' }, { status: 500 })
      return NextResponse.json({ ok: true, message: `Added “${t.title}” at ${fmtDateTime(start.toISOString(), tz)}` })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (e) {
    console.error('[templates] POST', e)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
