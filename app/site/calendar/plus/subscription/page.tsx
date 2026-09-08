import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import { getPlanInfo } from '@/lib/calendar/plan'
import SubscriptionClient from './SubscriptionClient'

export const metadata: Metadata = { title: 'Subscription — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function SubscriptionRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/subscription')
  const [ws, plan] = await Promise.all([loadPlusWorkspace(supabase), getPlanInfo(supabase)])
  return <SubscriptionClient ws={ws} plan={plan} />
}
