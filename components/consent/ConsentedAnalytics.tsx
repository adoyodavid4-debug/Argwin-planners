'use client'
// Analytics tags under UK GDPR / PECR:
//
// GA4 — Google Consent Mode v2. gtag.js loads for EVERY visitor, but the
// consent defaults in app/layout.tsx start all signals "denied", so before
// opt-in GA sets no cookies and stores no identifiers (cookieless pings only —
// this is what keeps "data collection active" in the GA property). When the
// visitor grants analytics/marketing consent we upgrade the signals here.
//
// Meta Pixel — no equivalent consent mode worth trusting, so it stays hard
// gated: fbevents.js is only injected after marketing consent.
import { useEffect } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'
import { useConsent } from './ConsentProvider'
import MetaPixel from './MetaPixel'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const RAW_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID
// Real Meta pixel ids are numeric (~15–16 digits). Ignore unset/placeholder
// values like "XXXXXXXXXXXX" so we never load a bogus pixel in dev.
const PIXEL_ID = RAW_PIXEL_ID && /^\d{6,}$/.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : undefined

export default function ConsentedAnalytics() {
  const { ready, consent } = useConsent()

  // Push consent updates whenever the stored decision (re)hydrates or changes.
  useEffect(() => {
    if (!ready) return
    try {
      window.gtag?.('consent', 'update', {
        analytics_storage: consent.analytics ? 'granted' : 'denied',
        ad_storage: consent.marketing ? 'granted' : 'denied',
        ad_user_data: consent.marketing ? 'granted' : 'denied',
        ad_personalization: consent.marketing ? 'granted' : 'denied',
      })
    } catch { /* gtag not loaded yet — defaults stay denied */ }
  }, [ready, consent.analytics, consent.marketing])

  return (
    <>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      {ready && consent.marketing && PIXEL_ID && <MetaPixel pixelId={PIXEL_ID} />}
    </>
  )
}
