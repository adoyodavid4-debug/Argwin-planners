import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import AnalyticsClient from './AnalyticsClient'

export const metadata: Metadata = { title: 'Calendar Health — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PlusAnalyticsRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/analytics')
  const ws = await loadPlusWorkspace(supabase)
  return <AnalyticsClient ws={ws} />
}
