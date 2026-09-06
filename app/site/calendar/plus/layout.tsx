// Plan gate for the Arwign Plus workspace. Free users are sent to the upgrade
// page; Plus/Teams subscribers (and admins) pass through.
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanInfo, meetsPlan } from '@/lib/calendar/plan'

export const dynamic = 'force-dynamic'

export default async function PlusGateLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/plus')
  const info = await getPlanInfo(supabase)
  if (!meetsPlan(info, 'plus')) redirect('/calendar/subscribe/plus')
  return <>{children}</>
}
