import type { Metadata } from 'next'
import PersonalizedClient from './PersonalizedClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

export const metadata: Metadata = {
  title: 'Personalised Notebooks — Designed Around You | Arwign Planners',
  description: 'Custom-made digital notebooks built to order. Choose your colourway, size, motif and templates — we hand-craft a hyperlinked notebook just for you. GoodNotes & Notability ready.',
  alternates: { canonical: `${BASE_URL}/notebooks/personalized` },
  openGraph: {
    title: 'Personalised Notebooks — Arwign Planners',
    description: 'Custom-made digital notebooks built to order — choose your colourway, size and motif.',
    url: `${BASE_URL}/notebooks/personalized`,
    type: 'website',
  },
}

export default function PersonalizedNotebooksPage() {
  return <PersonalizedClient />
}
