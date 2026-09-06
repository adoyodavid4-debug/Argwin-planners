// Plan gate for the Arwign Teams workspace. Only Teams subscribers (and admins)
// pass through; everyone else is sent to the Teams upgrade page.
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanInfo, meetsPlan } from '@/lib/calendar/plan'

export const dynamic = 'force-dynamic'

export default async function TeamGateLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team')
  const info = await getPlanInfo(supabase)
  if (!meetsPlan(info, 'teams')) redirect('/calendar/subscribe/teams')
  return <>{children}</>
}
