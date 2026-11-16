'use client'

import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import type { IntegrationRecord } from '@/lib/agents/types'

interface Props {
  integrations: IntegrationRecord[]
  envStatus:    Record<string, boolean>
}

const PLATFORM_META: Record<string, {
  label: string; group: string; docs: string; requiredEnvs: string[]
  usedBy: string[]
}> = {
  whatsapp:              { label: 'WhatsApp Cloud API',       group: 'Meta',         docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',          requiredEnvs: ['WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_BUSINESS_ACCOUNT_ID','META_SYSTEM_USER_TOKEN'], usedBy: ['Sales Agent'] },
  instagram:             { label: 'Instagram Graph API',      group: 'Meta',         docs: 'https://developers.facebook.com/docs/instagram-api',              requiredEnvs: ['IG_BUSINESS_ACCOUNT_ID','META_SYSTEM_USER_TOKEN'],                                     usedBy: ['Sales Agent','Short Video Agent'] },
  messenger:             { label: 'Facebook Messenger',       group: 'Meta',         docs: 'https://developers.facebook.com/docs/messenger-platform',         requiredEnvs: ['FB_PAGE_ID','META_SYSTEM_USER_TOKEN'],                                                usedBy: ['Sales Agent'] },
  meta_ads:              { label: 'Meta Ads / Marketing API', group: 'Meta',         docs: 'https://developers.facebook.com/docs/marketing-apis',             requiredEnvs: ['META_AD_ACCOUNT_ID','META_PIXEL_ID','META_CAPI_TOKEN'],                               usedBy: ['Ads Manager Agent'] },
  pinterest:             { label: 'Pinterest API v5',         group: 'Pinterest',    docs: 'https://developers.pinterest.com/docs/api/v5/',                   requiredEnvs: ['PINTEREST_APP_ID','PINTEREST_APP_SECRET','PINTEREST_REFRESH_TOKEN'],                   usedBy: ['Pinterest Agent'] },
  etsy:                  { label: 'Etsy Open API v3',         group: 'Marketplaces', docs: 'https://developer.etsy.com/documentation',                       requiredEnvs: ['ETSY_KEYSTRING','ETSY_SHARED_SECRET','ETSY_SHOP_ID','ETSY_REFRESH_TOKEN'],             usedBy: ['Marketplace Listing Agent'] },
  gumroad:               { label: 'Gumroad API',              group: 'Marketplaces', docs: 'https://app.gumroad.com/api',                                     requiredEnvs: ['GUMROAD_ACCESS_TOKEN'],                                                               usedBy: ['Marketplace Listing Agent'] },
  tiktok:                { label: 'TikTok Content Posting',   group: 'TikTok',       docs: 'https://developers.tiktok.com/doc/content-posting-api-get-started', requiredEnvs: ['TIKTOK_CLIENT_KEY','TIKTOK_CLIENT_SECRET'],                                       usedBy: ['Short Video Agent'] },
  resend:                { label: 'Resend Email',             group: 'Email',        docs: 'https://resend.com/docs',                                         requiredEnvs: ['RESEND_API_KEY','RESEND_AUDIENCE_ID'],                                                usedBy: ['Email Agent','Support & Reviews Agent'] },
  google_search_console: { label: 'Google Search Console',    group: 'Search',       docs: 'https://developers.google.com/webmaster-tools',                   requiredEnvs: ['GSC_SERVICE_ACCOUNT_JSON','GSC_PROPERTY'],                                            usedBy: ['SEO Blog Agent','Trend Research Agent'] },
  stripe:                { label: 'Stripe',                   group: 'Payments',     docs: 'https://stripe.com/docs/api',                                     requiredEnvs: ['STRIPE_SECRET_KEY'],                                                                  usedBy: ['Sales Agent','Ads Manager Agent'] },
  paystack:              { label: 'Paystack',                 group: 'Payments',     docs: 'https://paystack.com/docs/api/',                                  requiredEnvs: ['PAYSTACK_SECRET_KEY'],                                                                usedBy: ['Sales Agent','Ads Manager Agent'] },
}

const GROUPS = ['Meta','Pinterest','Marketplaces','TikTok','Email','Search','Payments']

function StatusIcon({ status, envOk }: { status: string; envOk: boolean }) {
  if (!envOk) return <XCircle size={16} style={{ color: 'var(--text-muted)' }} />
  if (status === 'connected') return <CheckCircle size={16} style={{ color: '#6E7E66' }} />
  if (status === 'error')     return <AlertTriangle size={16} style={{ color: '#C9847C' }} />
  if (status === 'expired')   return <Clock size={16} style={{ color: '#C9A84C' }} />
  return <XCircle size={16} style={{ color: 'var(--text-muted)' }} />
}

export default function IntegrationsClient({ integrations, envStatus }: Props) {
  const byPlatform = Object.fromEntries(integrations.map(i => [i.platform, i]))

  const connectedCount = integrations.filter(i =>
    i.status === 'connected' && envStatus[i.platform]
  ).length

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Integrations</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {connectedCount} of {integrations.length} platforms connected. Secrets must be set in Vercel environment variables.
        </p>
      </div>

      {GROUPS.map(group => {
        const platforms = Object.entries(PLATFORM_META).filter(([, m]) => m.group === group)
        return (
          <div key={group}>
            <h2 className="font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              {group}
            </h2>
            <div className="space-y-2">
              {platforms.map(([platform, meta]) => {
                const record = byPlatform[platform]
                const envOk  = envStatus[platform] ?? false
                const status = record?.status ?? 'disconnected'

                return (
                  <div
                    key={platform}
                    className="flex items-start gap-4 p-4 rounded-2xl border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    <StatusIcon status={status} envOk={envOk} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{meta.label}</p>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {meta.usedBy.join(', ')}
                        </span>
                      </div>
                      {!envOk && (
                        <p className="text-xs" style={{ color: '#C9847C' }}>
                          Missing env vars: {meta.requiredEnvs.join(', ')}
                        </p>
                      )}
                      {envOk && status === 'connected' && record?.last_success_at && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Last checked {new Date(record.last_success_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                        </p>
                      )}
                      {envOk && status === 'expired' && (
                        <p className="text-xs" style={{ color: '#C9A84C' }}>
                          Token expired — refresh required
                        </p>
                      )}
                      {envOk && status === 'error' && record?.error_msg && (
                        <p className="text-xs" style={{ color: '#C9847C' }}>{record.error_msg}</p>
                      )}
                    </div>
                    <a
                      href={meta.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex-shrink-0 hover:underline"
                      style={{ color: 'var(--gold)' }}
                    >
                      Docs →
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div
        className="p-4 rounded-xl border text-xs space-y-1"
        style={{ background: 'rgba(201,168,76,0.08)', borderColor: 'var(--border-gold)', color: 'var(--text-secondary)' }}
      >
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Prerequisites before connecting</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>Meta Business Manager verified with business verification</li>
          <li>WhatsApp number registered on the Cloud API; Meta App Review for messaging, comments and ads permissions</li>
          <li>Facebook Page and Instagram professional account linked to the app</li>
          <li>Pinterest developer app created and approved</li>
          <li>Etsy app approved and shop ID confirmed</li>
          <li>TikTok app audit completed (optional — video agent will queue files for manual posting until then)</li>
          <li>Resend sending domain verified with SPF, DKIM and DMARC</li>
          <li>Google Search Console property added and service account granted access</li>
          <li>Postal address set in Settings (required in every marketing email footer)</li>
        </ul>
      </div>
    </div>
  )
}
