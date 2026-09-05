import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import OverviewClient from './OverviewClient'

export const metadata: Metadata = { title: 'Team Overview — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function TeamOverviewRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team')
  const ws = await loadTeamWorkspace(supabase)
  return <OverviewClient ws={ws} />
}
