import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import CalendarsClient from './CalendarsClient'

export const metadata: Metadata = { title: 'Shared Calendars — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function CalendarsRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/calendars')
  const ws = await loadTeamWorkspace(supabase)
  return <CalendarsClient ws={ws} />
}
