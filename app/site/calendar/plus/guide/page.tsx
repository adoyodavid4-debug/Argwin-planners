import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import PlusGuideClient from './PlusGuideClient'

export const metadata: Metadata = { title: 'How to use & integrate — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PlusGuideRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/guide')
  const ws = await loadPlusWorkspace(supabase)
  return <PlusGuideClient ws={ws} />
}
