import type { Metadata } from 'next'
import ConfirmedClient from './ConfirmedClient'

export const metadata: Metadata = {
  title: 'Download Confirmed — Arwign Planners',
  description: 'Your free Arwign Planners download is confirmed and on its way to your inbox.',
  robots: { index: false, follow: false },
}

export default function ConfirmedPage() {
  return <ConfirmedClient />
}
