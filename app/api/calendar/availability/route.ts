import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlots, wallTimeToUtc, type BookingPageConfig } from '@/lib/calendar/slots'
import { busyIntervalsForUser } from '@/lib/calendar/busy'

export const dynamic = 'force-dynamic'

// GET /api/calendar/availability?slug=<page>&date=YYYY-MM-DD
// Returns the bookable slots for a page on a given local date.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  const date = req.nextUrl.searchParams.get('date')?.trim()
  if (!slug || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'slug and date (YYYY-MM-DD) are required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data: page } = await supabase
    .from('booking_pages')
    .select('id, owner_id, title, description, duration_min, buffer_min, min_notice_hours, advance_days, timezone, working_hours, location, colour, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!page) return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })

  // Busy = the owner's calendar events overlapping this local day (bookings also
  // land here as events, so this is the single source of truth). Recurring
  // events are expanded per-occurrence so every instance blocks its slot.
  const [y, m, d] = date.split('-').map(Number)
  const dayStart = wallTimeToUtc(y, m, d, 0, 0, page.timezone)
  const dayEnd = wallTimeToUtc(y, m, d + 1, 0, 0, page.timezone)
  const busy = await busyIntervalsForUser(supabase, page.owner_id, dayStart, dayEnd)
  const slots = generateSlots(page as unknown as BookingPageConfig, date, busy)

  return NextResponse.json({
    page: {
      title: page.title,
      description: page.description,
      duration_min: page.duration_min,
      timezone: page.timezone,
      location: page.location,
      colour: page.colour,
    },
    date,
    slots,
  })
}
