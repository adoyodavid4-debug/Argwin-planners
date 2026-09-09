// lib/calendar/booking.ts — shared booking side-effects: put the meeting on the
// owner's calendar and send confirmation emails. Reused by the free-booking path
// (/api/calendar/bookings) and the paid path (Stripe webhook after payment).

import type { EmailProvider } from '@/lib/email'
import { fmtWhen } from './fmt'

interface PageLike {
  id: string; owner_id: string; title: string; timezone: string; location: string | null; colour: string | null
}
interface BookingLike {
  id: string; name: string; email: string; notes?: string | null; start: string; end: string
}

// Create the calendar event for a confirmed booking and link it back. Returns
// the event id (or null on failure). Idempotent-friendly: callers should only
// invoke once per booking.
export async function createBookingEvent(supabase: any, page: PageLike, b: BookingLike): Promise<string | null> {
  const { data: event } = await supabase
    .from('calendar_events')
    .insert({
      user_id: page.owner_id,
      title: `${page.title} — ${b.name}`,
      description: [b.notes, `Booked by ${b.name} <${b.email}>`].filter(Boolean).join('\n\n'),
      location: page.location,
      start_at: b.start, end_at: b.end,
      start_tz: page.timezone, colour: page.colour ?? 'sage',
    })
    .select('id')
    .single()
  if (event?.id) await supabase.from('bookings').update({ event_id: event.id }).eq('id', b.id)
  return event?.id ?? null
}

export async function sendBookingEmails(
  supabase: any, provider: EmailProvider, page: PageLike,
  b: { id: string; name: string; email: string; start: Date },
): Promise<void> {
  const when = `${fmtWhen(b.start, page.timezone)} (${page.timezone})`

  await provider.sendTransactional({
    to: b.email, locale: 'en', templateKey: 'calendar.booking',
    data: { role: 'guest', title: page.title, when, location: page.location, guest_name: b.name },
    idempotencyKey: `booking-guest:${b.id}`,
  })

  const { data: ownerUser } = await supabase.auth.admin.getUserById(page.owner_id)
  const ownerEmail = ownerUser?.user?.email
  if (ownerEmail) {
    await provider.sendTransactional({
      to: ownerEmail, locale: 'en', templateKey: 'calendar.booking',
      data: { role: 'owner', title: page.title, when, location: page.location, guest_name: `${b.name} <${b.email}>` },
      idempotencyKey: `booking-owner:${b.id}`,
    })
  }
}
