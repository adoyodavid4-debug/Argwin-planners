import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import ResourcesClient from './ResourcesClient'

export const metadata: Metadata = { title: 'Rooms & Resources — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ResourcesRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/resources')
  const ws = await loadTeamWorkspace(supabase)
  return <ResourcesClient ws={ws} />
}
