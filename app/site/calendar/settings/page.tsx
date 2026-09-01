import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = { title: 'Settings · Arwign Calendar', robots: { index: false, follow: false } }

export default async function CalendarSettingsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/settings')
  return <SettingsClient />
}
