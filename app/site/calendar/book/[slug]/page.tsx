import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarX } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BookingClient, { type PublicPage } from './BookingClient'

export const dynamic = 'force-dynamic'

async function getPage(slug: string): Promise<PublicPage | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('booking_pages')
    .select('slug, title, description, duration_min, timezone, location, colour, is_active, price_cents, currency, requires_payment')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  return (data as PublicPage) ?? null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getPage(params.slug)
  const title = page ? `Book — ${page.title} | Arwign Calendar` : 'Booking not found | Arwign Calendar'
  return { title, robots: { index: false, follow: false } }
}

export default async function BookPage({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug)

  if (!page) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
            <CalendarX size={26} style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>This booking link isn’t available</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>The page may have been paused or the link is incorrect.</p>
          <Link href="/calendar" className="btn-outline">Back to Arwign Calendar</Link>
        </div>
      </div>
    )
  }

  return <BookingClient page={page} />
}
