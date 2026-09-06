import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import TeamGuideClient from './TeamGuideClient'

export const metadata: Metadata = { title: 'How to use & integrate — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function TeamGuideRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/guide')
  const ws = await loadTeamWorkspace(supabase)
  return <TeamGuideClient ws={ws} />
}
