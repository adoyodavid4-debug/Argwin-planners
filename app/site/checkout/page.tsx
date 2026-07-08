// app/site/checkout/page.tsx
import type { Metadata } from 'next'
import CheckoutClient from './CheckoutClient'

export const metadata: Metadata = {
  title: 'Secure Checkout — Arwign Planners',
  description: 'Complete your order securely with card or PayPal. Instant digital download after payment.',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return <CheckoutClient />
}
