import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import IntegrationsClient from './IntegrationsClient'

export const metadata: Metadata = { title: 'Integrations — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PlusIntegrationsRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/integrations')
  const ws = await loadPlusWorkspace(supabase)
  return <IntegrationsClient ws={ws} />
}
