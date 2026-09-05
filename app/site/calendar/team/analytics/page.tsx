import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import AnalyticsClient from './AnalyticsClient'

export const metadata: Metadata = { title: 'Team Analytics — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function TeamAnalyticsRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/analytics')
  const ws = await loadTeamWorkspace(supabase)
  return <AnalyticsClient ws={ws} />
}
