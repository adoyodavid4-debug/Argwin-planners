// app/api/calendar/team-bookings/route.ts — public booking against a TEAM booking
// page (/calendar/team-book/[team]/[slug]). Mirrors the individual booking route
// but schedules across multiple hosts and honours each page's own availability
// config (migration 025: timezone / working_hours / buffer / notice / horizon /
// capacity):
//   • round-robin — bookable if ANY host is free; assigned to the least-booked
//     free host (even distribution).
//   • collective — bookable only when ALL hosts are free; the slot is held once
//     (keyed on the lead host) and lands on every host's calendar.
//   • group — many invitees share one slot up to `capacity`. The first invitee's
//     booking requires all hosts free and creates the shared host event(s);
//     later invitees just take a remaining seat on the same session.
//
// Runs with the service role (like the individual route) so it can read every
// host's calendar_events under RLS, and sends confirmation emails best-effort.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlots, wallTimeToUtc, type BookingPageConfig, type Interval, type Slot } from '@/lib/calendar/slots'
import { busyIntervalsForUsers } from '@/lib/calendar/busy'
import { fmtWhen } from '@/lib/calendar/fmt'
import { getEmailProvider } from '@/lib/email'

export const dynamic = 'force-dynamic'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEFAULT_HOURS: Record<string, [string, string][]> = {
  '1': [['09:00', '17:00']], '2': [['09:00', '17:00']], '3': [['09:00', '17:00']],
  '4': [['09:00', '17:00']], '5': [['09:00', '17:00']],
}

interface Host { member_id: string; user_id: string; name: string; email: string }
interface Ctx {
  page: { id: string; team_id: string; name: string; type: string; duration_min: number; capacity: number }
  cfg: BookingPageConfig
  hosts: Host[]
}

function localDateStr(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)
}

// Load the team, active page (with config) and its active, linked hosts.
async function loadCtx(supabase: any, teamId: string, slug: string): Promise<Ctx | null> {
  const { data: page } = await supabase
    .from('team_booking_pages')
    .select('id, team_id, name, type, member_ids, duration_min, active, timezone, working_hours, buffer_min, min_notice_hours, advance_days, capacity')
    .eq('team_id', teamId).eq('slug', slug).eq('active', true)
    .maybeSingle()
  if (!page) return null

  const { data: team } = await supabase.from('teams').select('timezone').eq('id', teamId).maybeSingle()
  const timezone = page.timezone ?? team?.timezone ?? 'America/New_York'

  const ids: string[] = page.member_ids ?? []
  if (ids.length === 0) return null
  const { data: members } = await supabase
    .from('team_members')
    .select('id, user_id, name, email, status')
    .eq('team_id', teamId).in('id', ids)
  const hosts: Host[] = (members ?? [])
    .filter((m: any) => m.status === 'active' && m.user_id)
    .map((m: any) => ({ member_id: m.id, user_id: m.user_id, name: m.name, email: m.email }))
  if (hosts.length === 0) return null

  const cfg: BookingPageConfig = {
    duration_min: page.duration_min,
    buffer_min: page.buffer_min ?? 0,
    min_notice_hours: page.min_notice_hours ?? 4,
    advance_days: page.advance_days ?? 30,
    timezone,
    working_hours: page.working_hours ?? DEFAULT_HOURS,
  }

  return {
    page: {
      id: page.id, team_id: page.team_id, name: page.name, type: page.type,
      duration_min: page.duration_min, capacity: Math.max(1, page.capacity ?? 1),
    },
    cfg,
    hosts,
  }
}

// Busy intervals per host for a local date: their calendar_events plus any
// confirmed team_bookings already assigned to them on that page (round-robin /
// collective). Group bookings carry a null assignee and are handled by capacity.
async function busyByHost(supabase: any, ctx: Ctx, dateStr: string): Promise<Map<string, Interval[]>> {
  const tz = ctx.cfg.timezone
  const [y, m, d] = dateStr.split('-').map(Number)
  const dayStart = wallTimeToUtc(y, m, d, 0, 0, tz)
  const dayEnd = wallTimeToUtc(y, m, d + 1, 0, 0, tz)
  const byHost = new Map<string, Interval[]>()
  for (const h of ctx.hosts) byHost.set(h.member_id, [])

  const userIds = ctx.hosts.map((h) => h.user_id)
  // Expands recurring events per-occurrence (see lib/calendar/busy) so a host's
  // weekly meeting blocks its slot on every week, not just the first.
  const byUser = await busyIntervalsForUsers(supabase, userIds, dayStart, dayEnd)
  for (const h of ctx.hosts) byHost.set(h.member_id, byUser.get(h.user_id) ?? [])

  const { data: booked } = await supabase
    .from('team_bookings')
    .select('assigned_member_id, start_at, end_at')
    .eq('page_id', ctx.page.id).eq('status', 'confirmed')
    .lt('start_at', dayEnd.toISOString())
    .gt('end_at', dayStart.toISOString())
  for (const b of booked ?? []) {
    if (!b.assigned_member_id) continue
    const arr = byHost.get(b.assigned_member_id)
    if (arr) arr.push({ start: new Date(b.start_at), end: new Date(b.end_at) })
  }
  return byHost
}

// Confirmed booking counts per slot start-ISO for a page on a date (for group capacity).
async function slotCounts(supabase: any, ctx: Ctx, dateStr: string): Promise<Map<string, number>> {
  const tz = ctx.cfg.timezone
  const [y, m, d] = dateStr.split('-').map(Number)
  const dayStart = wallTimeToUtc(y, m, d, 0, 0, tz)
  const dayEnd = wallTimeToUtc(y, m, d + 1, 0, 0, tz)
  const { data } = await supabase
    .from('team_bookings')
    .select('start_at')
    .eq('page_id', ctx.page.id).eq('status', 'confirmed')
    .gte('start_at', dayStart.toISOString())
    .lt('start_at', dayEnd.toISOString())
  const counts = new Map<string, number>()
  for (const b of data ?? []) {
    const iso = new Date(b.start_at).toISOString()
    counts.set(iso, (counts.get(iso) ?? 0) + 1)
  }
  return counts
}

// Free slots for the page on a date, per page type.
function availableSlots(ctx: Ctx, dateStr: string, byHost: Map<string, Interval[]>, counts: Map<string, number>): Slot[] {
  const cfg = ctx.cfg
  const perHost = ctx.hosts.map((h) => ({ host: h, slots: generateSlots(cfg, dateStr, byHost.get(h.member_id) ?? []) }))

  if (ctx.page.type === 'round-robin') {
    const seen = new Map<string, Slot>()
    for (const p of perHost) for (const s of p.slots) if (!seen.has(s.startISO)) seen.set(s.startISO, s)
    return Array.from(seen.values()).sort((a, b) => a.startISO.localeCompare(b.startISO))
  }

  if (ctx.page.type === 'collective') {
    if (perHost.length === 0) return []
    const [first, ...rest] = perHost
    return first.slots
      .filter((s) => rest.every((p) => p.slots.some((x) => x.startISO === s.startISO)))
      .sort((a, b) => a.startISO.localeCompare(b.startISO))
  }

  // group: base grid within working hours; a slot is open if seats remain, and
  // (for a brand-new session) every host is free. Once someone has booked, the
  // session exists and only capacity matters.
  const grid = generateSlots(cfg, dateStr, [])
  const allFree = (iso: string) => perHost.every((p) => p.slots.some((x) => x.startISO === iso))
  return grid.filter((s) => {
    const taken = counts.get(s.startISO) ?? 0
    if (taken >= ctx.page.capacity) return false
    return taken > 0 ? true : allFree(s.startISO)
  }).sort((a, b) => a.startISO.localeCompare(b.startISO))
}

function whenLabel(iso: string, tz: string): string {
  return `${fmtWhen(iso, tz)} (${tz})`
}

// Best-effort confirmation emails: guest + each host. Never throws.
async function sendEmails(ctx: Ctx, bookingId: string, guest: { name: string; email: string }, startISO: string, eventHosts: Host[]): Promise<void> {
  try {
    const provider = getEmailProvider()
    const when = whenLabel(startISO, ctx.cfg.timezone)
    await provider.sendTransactional({
      to: guest.email, locale: 'en', templateKey: 'calendar.booking',
      data: { role: 'guest', title: ctx.page.name, when, guest_name: guest.name },
      idempotencyKey: `team-booking-guest:${bookingId}`,
    }).catch(() => {})
    for (const h of eventHosts) {
      if (!h.email) continue
      await provider.sendTransactional({
        to: h.email, locale: 'en', templateKey: 'calendar.booking',
        data: { role: 'owner', title: ctx.page.name, when, guest_name: `${guest.name} <${guest.email}>` },
        idempotencyKey: `team-booking-host:${bookingId}:${h.member_id}`,
      }).catch(() => {})
    }
  } catch { /* email is non-fatal */ }
}

// GET /api/calendar/team-bookings?team=&slug=&date=YYYY-MM-DD — available slots.
export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get('team') ?? ''
  const slug = req.nextUrl.searchParams.get('slug') ?? ''
  const date = req.nextUrl.searchParams.get('date') ?? ''
  if (!team || !slug || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'team, slug and a valid date are required' }, { status: 400 })
  }
  const supabase = createServiceRoleClient()
  const ctx = await loadCtx(supabase, team, slug)
  if (!ctx) return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })

  const [byHost, counts] = await Promise.all([busyByHost(supabase, ctx, date), slotCounts(supabase, ctx, date)])
  return NextResponse.json({ slots: availableSlots(ctx, date, byHost, counts) })
}

// POST /api/calendar/team-bookings — create a booking (free; no payment).
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const team = String(body?.team ?? '').trim()
  const slug = String(body?.slug ?? '').trim()
  const startISO = String(body?.startISO ?? '').trim()
  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const notes = body?.notes ? String(body.notes).slice(0, 2000) : null
  const guestTz = body?.guestTz ? String(body.guestTz).slice(0, 64) : null

  if (!team || !slug || !startISO || !name || !emailRe.test(email)) {
    return NextResponse.json({ error: 'Name, a valid email, and a chosen time are required.' }, { status: 400 })
  }
  const start = new Date(startISO)
  if (isNaN(start.getTime())) return NextResponse.json({ error: 'Invalid time.' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const ctx = await loadCtx(supabase, team, slug)
  if (!ctx) return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })

  const end = new Date(start.getTime() + ctx.page.duration_min * 60000)
  const date = localDateStr(start, ctx.cfg.timezone)
  const byHost = await busyByHost(supabase, ctx, date)

  const freeAt = (memberId: string) =>
    generateSlots(ctx.cfg, date, byHost.get(memberId) ?? []).some((s) => s.startISO === start.toISOString())
  const freeHosts = ctx.hosts.filter((h) => freeAt(h.member_id))

  let assigneeId: string | null
  let eventHosts: Host[]
  let reuseEventId: string | null = null

  if (ctx.page.type === 'round-robin') {
    if (freeHosts.length === 0) {
      return NextResponse.json({ error: 'Sorry — that time is no longer available. Please pick another.' }, { status: 409 })
    }
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: recent } = await supabase
      .from('team_bookings').select('assigned_member_id')
      .eq('page_id', ctx.page.id).eq('status', 'confirmed').gte('created_at', since)
    const load = new Map<string, number>()
    for (const r of recent ?? []) if (r.assigned_member_id) load.set(r.assigned_member_id, (load.get(r.assigned_member_id) ?? 0) + 1)
    const assignee = [...freeHosts].sort((a, b) =>
      (load.get(a.member_id) ?? 0) - (load.get(b.member_id) ?? 0) || a.member_id.localeCompare(b.member_id))[0]
    assigneeId = assignee.member_id
    eventHosts = [assignee]
  } else if (ctx.page.type === 'collective') {
    if (freeHosts.length !== ctx.hosts.length) {
      return NextResponse.json({ error: 'Sorry — that time is no longer available. Please pick another.' }, { status: 409 })
    }
    assigneeId = ctx.hosts[0].member_id
    eventHosts = ctx.hosts
  } else {
    // group: seats up to capacity; first booking requires all hosts free.
    const counts = await slotCounts(supabase, ctx, date)
    const taken = counts.get(start.toISOString()) ?? 0
    if (taken >= ctx.page.capacity) {
      return NextResponse.json({ error: 'Sorry — this session is now full. Please pick another time.' }, { status: 409 })
    }
    if (taken === 0) {
      if (freeHosts.length !== ctx.hosts.length) {
        return NextResponse.json({ error: 'Sorry — that time is no longer available. Please pick another.' }, { status: 409 })
      }
      eventHosts = ctx.hosts // create the shared session event(s)
    } else {
      eventHosts = [] // session already exists; reuse its event
      const { data: prior } = await supabase
        .from('team_bookings').select('event_id')
        .eq('page_id', ctx.page.id).eq('status', 'confirmed')
        .eq('start_at', start.toISOString())
        .not('event_id', 'is', null).limit(1).maybeSingle()
      reuseEventId = prior?.event_id ?? null
    }
    assigneeId = null // group seats aren't pinned to a host
  }

  // Reserve the seat (partial unique index blocks a double-book for RR/collective;
  // group seats are null-assignee so many coexist, bounded by the capacity check).
  const { data: booking, error: bErr } = await supabase
    .from('team_bookings')
    .insert({
      team_id: ctx.page.team_id, page_id: ctx.page.id, assigned_member_id: assigneeId,
      name, email, notes, guest_tz: guestTz,
      start_at: start.toISOString(), end_at: end.toISOString(), status: 'confirmed',
    })
    .select('id')
    .single()

  if (bErr) {
    const conflict = (bErr as any).code === '23505'
    return NextResponse.json(
      { error: conflict ? 'Sorry — that time was just taken. Please pick another.' : 'Could not create the booking.' },
      { status: conflict ? 409 : 500 },
    )
  }

  // Put the meeting on each relevant host's calendar (or reuse the group session's event).
  let firstEventId: string | null = reuseEventId
  for (const h of eventHosts) {
    const { data: ev } = await supabase
      .from('calendar_events')
      .insert({
        user_id: h.user_id,
        title: `${ctx.page.name} — ${ctx.page.type === 'group' ? 'group session' : name}`,
        description: [notes, `Booked by ${name} <${email}>`].filter(Boolean).join('\n\n'),
        start_at: start.toISOString(), end_at: end.toISOString(),
        start_tz: ctx.cfg.timezone, colour: 'brass',
      })
      .select('id')
      .single()
    if (ev?.id && !firstEventId) firstEventId = ev.id
  }
  if (firstEventId) await supabase.from('team_bookings').update({ event_id: firstEventId }).eq('id', booking.id)

  // Confirmation emails: guest always; hosts only when a new session/event was made.
  await sendEmails(ctx, booking.id, { name, email }, start.toISOString(), eventHosts)

  return NextResponse.json({
    ok: true,
    booking: {
      id: booking.id, title: ctx.page.name, name, email,
      startISO: start.toISOString(), endISO: end.toISOString(),
      timezone: ctx.cfg.timezone, location: null,
    },
  })
}
