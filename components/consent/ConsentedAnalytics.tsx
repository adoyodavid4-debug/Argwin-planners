'use client'
// Gate for all non-essential tags. GA4 and the Meta Pixel are mounted only once
// their category is granted, so no analytics/marketing cookie is set before the
// visitor opts in (UK GDPR / PECR). ids come from build-time NEXT_PUBLIC_* env.
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
  if (!ready) return null
  return (
    <>
      {consent.analytics && GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      {consent.marketing && PIXEL_ID && <MetaPixel pixelId={PIXEL_ID} />}
    </>
  )
}
