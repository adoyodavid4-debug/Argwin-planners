import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import { loadTemplates } from '@/lib/calendar/templates'
import TemplatesClient from './TemplatesClient'

export const metadata: Metadata = { title: 'Event Templates — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function TeamTemplatesRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/templates')
  const [ws, templates] = await Promise.all([loadTeamWorkspace(supabase), loadTemplates(supabase)])
  return <TemplatesClient ws={ws} templates={templates} />
}
