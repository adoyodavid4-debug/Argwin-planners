import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import AvailabilityClient from './AvailabilityClient'

export const metadata: Metadata = { title: 'Availability Finder — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AvailabilityRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/availability')
  const ws = await loadTeamWorkspace(supabase)
  return <AvailabilityClient ws={ws} />
}
