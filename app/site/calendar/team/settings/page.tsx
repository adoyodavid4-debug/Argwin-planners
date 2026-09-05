import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import AdminClient from './AdminClient'

export const metadata: Metadata = { title: 'Admin Console — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AdminRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/settings')
  const ws = await loadTeamWorkspace(supabase)
  return <AdminClient ws={ws} />
}
