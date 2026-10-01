import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanInfo, meetsPlan } from '@/lib/calendar/plan'
import { isActiveTeamMember } from '@/lib/calendar/guard'
import CalendarApp from './CalendarApp'

export const metadata: Metadata = {
  title: 'Arwign Calendar',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CalendarAppPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  // New visitors from the "Create your free calendar" CTA should land on the
  // account-creation form (mode=signup), then return to the calendar once done.
  if (!user) redirect('/auth/login?mode=signup&redirect=/calendar/app')

  // Plan capability — drives which left-panel workspaces are unlocked. The real
  // enforcement is the server gate on each route; this just mirrors it in the UI
  // so free users see a locked/upgrade affordance instead of a silent redirect.
  const info = await getPlanInfo(supabase)
  const canPlus = meetsPlan(info, 'plus')
  const canTeams = meetsPlan(info, 'teams') || (await isActiveTeamMember(supabase))

  return <CalendarApp userEmail={user.email ?? ''} canPlus={canPlus} canTeams={canTeams} />
}
