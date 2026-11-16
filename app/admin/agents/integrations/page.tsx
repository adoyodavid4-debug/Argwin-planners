import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import IntegrationsClient from './IntegrationsClient'

export const metadata: Metadata = {
  title: 'Integrations — Agent Command Centre',
  robots: { index: false, follow: false },
}

export default async function IntegrationsPage() {
  const supabase = createServiceRoleClient()
  const { data }  = await supabase.from('ag_integrations').select('*').order('platform')

  // Check which API keys are configured (server-side only — never expose to client)
  const envStatus: Record<string, boolean> = {
    whatsapp:              !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    instagram:             !!process.env.IG_BUSINESS_ACCOUNT_ID,
    messenger:             !!process.env.FB_PAGE_ID,
    meta_ads:              !!process.env.META_AD_ACCOUNT_ID,
    pinterest:             !!process.env.PINTEREST_APP_ID,
    etsy:                  !!process.env.ETSY_KEYSTRING,
    gumroad:               !!process.env.GUMROAD_ACCESS_TOKEN,
    tiktok:                !!process.env.TIKTOK_CLIENT_KEY,
    resend:                !!process.env.RESEND_API_KEY,
    google_search_console: !!process.env.GSC_SERVICE_ACCOUNT_JSON,
    stripe:                !!process.env.STRIPE_SECRET_KEY,
    paystack:              !!process.env.PAYSTACK_SECRET_KEY,
  }

  return <IntegrationsClient integrations={data ?? []} envStatus={envStatus} />
}
