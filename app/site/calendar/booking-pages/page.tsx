import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanInfo, meetsPlan } from '@/lib/calendar/plan'
import BookingPagesClient from './BookingPagesClient'

export const metadata: Metadata = { title: 'Booking Pages — Arwign Calendar', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function BookingPagesRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/booking-pages')
  const info = await getPlanInfo(supabase)
  if (!meetsPlan(info, 'plus')) redirect('/calendar/subscribe/plus')

  const { data: pages } = await supabase
    .from('booking_pages')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, name, email, notes, start_at, end_at, status, booking_page_id')
    .eq('owner_id', user.id)
    .gte('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(100)

  return <BookingPagesClient initialPages={pages ?? []} bookings={bookings ?? []} />
}
