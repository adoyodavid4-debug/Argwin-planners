// Plan gate for the Arwign Teams workspace. Owner-pays model: personal Teams
// subscribers (and admins) pass, and so do active members of any team — their
// owner's subscription created it (RLS gate, migration 033). Invite acceptance
// lives at /calendar/join, OUTSIDE this gate, so invitees can join an
// owner-paid team before they'd ever hit the paywall.
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanInfo, meetsPlan } from '@/lib/calendar/plan'
import { isActiveTeamMember } from '@/lib/calendar/guard'

export const dynamic = 'force-dynamic'

export default async function TeamGateLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team')
  const info = await getPlanInfo(supabase)
  if (!meetsPlan(info, 'teams') && !(await isActiveTeamMember(supabase))) {
    redirect('/calendar/subscribe/teams')
  }
  return <>{children}</>
}
