import type { Metadata } from 'next'
import AboutClient from './AboutClient'

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
  return <AboutClient />
}
