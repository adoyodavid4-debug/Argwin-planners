import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import IntegrationsClient from './IntegrationsClient'

export const metadata: Metadata = { title: 'Integrations · Arwign Calendar', robots: { index: false, follow: false } }

export default async function IntegrationsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/integrations')

  // Which providers has the operator provisioned credentials for?
  const configured = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET),
    apple: true, // CalDAV/ICS interop needs no operator credentials
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    sms: !!(process.env.AT_API_KEY || process.env.TWILIO_ACCOUNT_SID),
    push: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  }

  const { data: rows } = await supabase.from('calendar_integrations').select('provider, status, account_email')

  return <IntegrationsClient configured={configured} rows={rows ?? []} />
}
