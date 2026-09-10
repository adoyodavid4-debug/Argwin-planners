import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlots, wallTimeToUtc, type BookingPageConfig } from '@/lib/calendar/slots'
import { getEmailProvider } from '@/lib/email'
import { createCheckoutSession } from '@/lib/stripe'
import { createBookingEvent, sendBookingEmails } from '@/lib/calendar/booking'
import { busyIntervalsForUser } from '@/lib/calendar/busy'

export const dynamic = 'force-dynamic'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function localDateStr(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)
}
function siteUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

// GET /api/calendar/bookings?id=<uuid> — public confirmation lookup (used when
// returning from Stripe). Only exposes the booker-facing summary.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createServiceRoleClient()
  const { data: b } = await supabase
    .from('bookings')
    .select('id, name, email, start_at, end_at, guest_tz, payment_status, booking_page_id')
    .eq('id', id).maybeSingle()
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: page } = await supabase.from('booking_pages').select('title, timezone, location').eq('id', b.booking_page_id).maybeSingle()
  return NextResponse.json({
    booking: {
      id: b.id, title: page?.title ?? 'Booking', name: b.name, email: b.email,
      startISO: b.start_at, endISO: b.end_at, timezone: page?.timezone ?? 'UTC',
      location: page?.location ?? null, paid: b.payment_status === 'paid', paymentStatus: b.payment_status,
    },
  })
}

// POST /api/calendar/bookings — create a booking. Free pages confirm instantly;
// paid pages reserve the slot and return a Stripe Checkout URL.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const slug = String(body?.slug ?? '').trim()
  const startISO = String(body?.startISO ?? '').trim()
  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const notes = body?.notes ? String(body.notes).slice(0, 2000) : null
  const guestTz = body?.guestTz ? String(body.guestTz).slice(0, 64) : null
  const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {}

  if (!slug || !startISO || !name || !emailRe.test(email)) {
    return NextResponse.json({ error: 'Name, a valid email, and a chosen time are required.' }, { status: 400 })
  }
  const start = new Date(startISO)
  if (isNaN(start.getTime())) return NextResponse.json({ error: 'Invalid time.' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: page } = await supabase
    .from('booking_pages')
    .select('id, owner_id, title, duration_min, buffer_min, min_notice_hours, advance_days, timezone, working_hours, location, colour, is_active, price_cents, currency, requires_payment')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!page) return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })

  const end = new Date(start.getTime() + page.duration_min * 60000)

  // Re-validate against the live schedule (never trust the client).
  const date = localDateStr(start, page.timezone)
  const [y, m, d] = date.split('-').map(Number)
  const dayStart = wallTimeToUtc(y, m, d, 0, 0, page.timezone)
  const dayEnd = wallTimeToUtc(y, m, d + 1, 0, 0, page.timezone)
  const busy = await busyIntervalsForUser(supabase, page.owner_id, dayStart, dayEnd)
  const ok = generateSlots(page as unknown as BookingPageConfig, date, busy).some((s) => s.startISO === start.toISOString())
  if (!ok) return NextResponse.json({ error: 'Sorry — that time is no longer available. Please pick another.' }, { status: 409 })

  const isPaid = !!page.requires_payment && Number(page.price_cents) > 0

  // Reserve the slot (partial unique index blocks double-booking).
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .insert({
      booking_page_id: page.id, owner_id: page.owner_id, name, email, notes, guest_tz: guestTz, answers,
      start_at: start.toISOString(), end_at: end.toISOString(), status: 'confirmed',
      amount_cents: isPaid ? page.price_cents : 0, currency: page.currency ?? 'USD',
      payment_provider: isPaid ? 'stripe' : null, payment_status: isPaid ? 'pending' : 'none',
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

  // ── Paid → Stripe Checkout; the event + emails happen on webhook confirmation.
  if (isPaid) {
    try {
      const site = siteUrl(req)
      const session = await createCheckoutSession({
        lineItems: [{
          price_data: {
            currency: String(page.currency ?? 'USD').toLowerCase(),
            product_data: { name: page.title },
            unit_amount: page.price_cents,
          },
          quantity: 1,
        }],
        successUrl: `${site}/calendar/book/${slug}?confirmed=${booking.id}`,
        cancelUrl: `${site}/calendar/book/${slug}?cancelled=1`,
        customerEmail: email,
        metadata: { type: 'calendar_booking', booking_id: booking.id },
      })
      await supabase.from('bookings').update({ payment_ref: session.id }).eq('id', booking.id)
      return NextResponse.json({ payment: true, url: session.url })
    } catch (e) {
      console.error('[booking] stripe session failed', e)
      // Roll back the reservation so the slot frees up.
      await supabase.from('bookings').delete().eq('id', booking.id)
      return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 })
    }
  }

  // ── Free → confirm now.
  const eventId = await createBookingEvent(supabase, page, {
    id: booking.id, name, email, notes, start: start.toISOString(), end: end.toISOString(),
  })
  await sendBookingEmails(supabase, getEmailProvider(), page, { id: booking.id, name, email, start, }).catch((e) => console.error('[booking] email', e))

  return NextResponse.json({
    ok: true,
    booking: {
      id: booking.id, title: page.title, name, email,
      startISO: start.toISOString(), endISO: end.toISOString(),
      timezone: page.timezone, location: page.location,
    },
    eventId,
  })
}
