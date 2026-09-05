import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import MembersClient from './MembersClient'

export const metadata: Metadata = { title: 'Members & Roles — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function MembersRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/members')
  const ws = await loadTeamWorkspace(supabase)
  return <MembersClient ws={ws} />
}
