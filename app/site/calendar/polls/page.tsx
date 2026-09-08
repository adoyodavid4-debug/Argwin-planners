import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanInfo, meetsPlan } from '@/lib/calendar/plan'
import PollsClient from './PollsClient'

export const metadata: Metadata = { title: 'Meeting polls · Arwign Calendar', robots: { index: false, follow: false } }

export default async function PollsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/polls')
  const info = await getPlanInfo(supabase)
  if (!meetsPlan(info, 'plus')) redirect('/calendar/subscribe/plus')
  return <PollsClient />
}
