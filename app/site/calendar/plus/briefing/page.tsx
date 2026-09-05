import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import BriefingClient from './BriefingClient'

export const metadata: Metadata = { title: 'Daily Briefing — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function BriefingRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/briefing')
  const ws = await loadPlusWorkspace(supabase)
  return <BriefingClient ws={ws} />
}
