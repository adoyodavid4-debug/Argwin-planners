import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import BookingClient from './BookingClient'

export const metadata: Metadata = { title: 'Team Booking Pages — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function TeamBookingRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/booking')
  const ws = await loadTeamWorkspace(supabase)
  return <BookingClient ws={ws} />
}
