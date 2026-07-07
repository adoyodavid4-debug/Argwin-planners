import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import CalendarApp from './CalendarApp'

export const metadata: Metadata = {
  title: 'Arwign Calendar',
  robots: { index: false, follow: false },
}

export default async function CalendarAppPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/app')

  return <CalendarApp userEmail={user.email ?? ''} />
}
