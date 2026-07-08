import type { Metadata } from 'next'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'
import AboutClient from './AboutClient'

const BASE = 'https://arwignplanners.com'

export const metadata: Metadata = {
  title: 'About Us — The Story Behind Arwign Planners',
  description:
    'Meet the team behind Arwign Planners. We create premium digital and printable planners designed for real people — intentional, beautiful, and built to help you thrive.',
  alternates: { canonical: 'https://arwignplanners.com/about' },
  openGraph: {
    title: 'About Arwign Planners',
    description: 'Premium digital planners designed with intention. Learn the story behind the brand.',
  },
}

export default function AboutPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: BASE },
        { name: 'About', url: `${BASE}/site/about` },
      ]} />
      <AboutClient />
    </>
  )
}
