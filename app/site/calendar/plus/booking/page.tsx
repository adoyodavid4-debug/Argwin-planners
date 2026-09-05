import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import BookingClient from './BookingClient'

export const metadata: Metadata = { title: 'Booking & Polls — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PlusBookingRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/booking')
  const ws = await loadPlusWorkspace(supabase)
  return <BookingClient ws={ws} />
}
