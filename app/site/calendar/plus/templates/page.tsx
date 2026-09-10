import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPlusWorkspace } from '@/lib/calendar/plus'
import { loadTemplates } from '@/lib/calendar/templates'
import TemplatesClient from './TemplatesClient'

export const metadata: Metadata = { title: 'Event Templates — Arwign Plus', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PlusTemplatesRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus/templates')
  const [ws, templates] = await Promise.all([loadPlusWorkspace(supabase), loadTemplates(supabase)])
  return <TemplatesClient ws={ws} templates={templates} />
}
