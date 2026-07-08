import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact Us — Arwign Planners',
  description:
    'Get in touch with the Arwign Planners team — questions about orders, products, or ideas for new planners. We reply to every message within 1–2 business days.',
  alternates: { canonical: 'https://arwignplanners.com/contact' },
  openGraph: {
    title: 'Contact Arwign Planners',
    description: 'Questions about an order, a product, or an idea you’d like to share? Get in touch — we reply to every message.',
  },
}

export default function ContactPage() {
  return <ContactClient />
}
