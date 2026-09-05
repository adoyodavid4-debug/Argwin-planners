import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import OverviewClient from './OverviewClient'

export const metadata: Metadata = { title: 'Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PlusOverviewRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus')
  const ws = await loadPlusWorkspace(supabase)
  return <OverviewClient ws={ws} />
}
