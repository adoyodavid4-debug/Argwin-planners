import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import { loadMoments } from '@/lib/calendar/moments'
import MomentsClient from './MomentsClient'

export const metadata: Metadata = { title: 'Moments & Memories — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PlusMomentsRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/moments')
  const [ws, moments] = await Promise.all([loadPlusWorkspace(supabase), loadMoments(supabase)])
  return <MomentsClient ws={ws} moments={moments} />
}
