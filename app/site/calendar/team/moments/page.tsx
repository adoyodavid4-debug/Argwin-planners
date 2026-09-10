import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import { loadMoments } from '@/lib/calendar/moments'
import MomentsClient from './MomentsClient'

export const metadata: Metadata = { title: 'Moments & Memories — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function TeamMomentsRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/moments')
  const [ws, moments] = await Promise.all([loadTeamWorkspace(supabase), loadMoments(supabase)])
  return <MomentsClient ws={ws} moments={moments} />
}
