// app/site/page.tsx — minimalist homepage
// Left: Best Sellers → Catalogue sample → "View More Planners".
// Right: the Arwign Calendar widget (schedule + reminders + booking).
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Crown } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import CalendarWidget, { type WidgetEvent } from '@/components/home/CalendarWidget'

export const metadata: Metadata = {
  title: 'Arwign Planners — Premium Digital & Printable Planners',
  description: 'Best-selling digital & printable planners and notebooks, plus the Arwign Calendar — schedule meetings, appointments and reminders in one calm place.',
  alternates: { canonical: 'https://arwignplanners.com' },
}

const FALLBACK = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'
const money = (n: number, c: string | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c ?? 'USD' }).format(n)

async function getData() {
  const supabase = createServerSupabaseClient()

  let { data: bestsellers } = await supabase
    .from('products')
    .select('id, title, slug, price, currency, thumbnail')
    .eq('status', 'active').eq('is_bestseller', true)
    .order('download_count', { ascending: false }).limit(6)
  if (!bestsellers || bestsellers.length === 0) {
    const { data } = await supabase.from('products')
      .select('id, title, slug, price, currency, thumbnail')
      .eq('status', 'active').order('download_count', { ascending: false }).limit(6)
    bestsellers = data ?? []
  }
  const bestIds = bestsellers.map((b) => b.id)

  // Assorted catalogue sample — a spread of recent planners, minus the bestsellers.
  const { data: assortedRaw } = await supabase
    .from('products')
    .select('id, title, slug, price, currency, thumbnail, category_id')
    .eq('status', 'active').eq('product_type', 'planner')
    .order('created_at', { ascending: false }).limit(80)
  const CATALOGUE_COUNT = 15
  const pool = (assortedRaw ?? []).filter((p) => !bestIds.includes(p.id))
  const seenCat = new Set<string>()
  const assorted: any[] = []
  // Pass 1 — one per category for a varied spread.
  for (const p of pool) {
    const key = p.category_id ?? p.id
    if (seenCat.has(key)) continue
    seenCat.add(key)
    assorted.push(p)
    if (assorted.length >= CATALOGUE_COUNT) break
  }
  // Pass 2 — fill the remainder with anything left.
  if (assorted.length < CATALOGUE_COUNT) {
    const have = new Set(assorted.map((p) => p.id))
    for (const p of pool) {
      if (have.has(p.id)) continue
      assorted.push(p); have.add(p.id)
      if (assorted.length >= CATALOGUE_COUNT) break
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  let events: WidgetEvent[] = []
  if (user) {
    const { data } = await supabase
      .from('calendar_events')
      .select('id, title, start_at, end_at, all_day, location, colour')
      .gte('end_at', new Date(Date.now() - 86400000).toISOString())
      .order('start_at', { ascending: true }).limit(60)
    events = (data as WidgetEvent[]) ?? []
  }

  return { bestsellers, assorted, events, isLoggedIn: !!user }
}

function ProductCard({ p }: { p: any }) {
  return (
    <Link href={`/shop/${p.slug}`} className="group block">
      <div className="rounded-2xl overflow-hidden border transition-shadow duration-300 group-hover:shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: '#000' }}>
          <Image src={p.thumbnail || FALLBACK} alt={p.title} fill sizes="(max-width:640px) 45vw, 200px" className="object-contain transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        <div className="p-3">
          <p className="text-sm font-medium leading-snug line-clamp-2 transition-colors group-hover:text-gold" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
          {p.price != null && <p className="text-sm font-semibold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</p>}
        </div>
      </div>
    </Link>
  )
}

export default async function HomePage() {
  const { bestsellers, assorted, events, isLoggedIn } = await getData()

  return (
    <div style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site py-10 lg:py-14">
        {/* Slim header */}
        <header className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.14em' }}>Arwign Planners</p>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', lineHeight: 1.1, color: 'var(--text-primary)' }}>
            Plan gently. Schedule calmly.
          </h1>
          <p className="mt-2 text-sm max-w-xl" style={{ color: 'var(--text-secondary)' }}>
            Beautiful digital &amp; printable planners and notebooks — with the Arwign Calendar to keep your days in order.
          </p>
        </header>

        {/* Two-column: catalogue (left) · calendar (right) */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-10 items-start">
          {/* LEFT */}
          <main className="min-w-0">
            {/* Catalogue sample */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Catalogue</h2>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>An assorted sample</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {assorted.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              <div className="mt-7 text-center">
                <Link href="/shop" className="btn-primary">View More Planners <ArrowRight size={16} /></Link>
              </div>
            </section>

            {/* Best Sellers */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl inline-flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Crown size={18} style={{ color: 'var(--gold)' }} /> Best Sellers
                </h2>
                <Link href="/best-sellers" className="text-sm inline-flex items-center gap-1 hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>All <ArrowRight size={13} /></Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {bestsellers.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            </section>
          </main>

          {/* RIGHT — calendar */}
          <aside className="lg:sticky lg:top-24 self-start order-first lg:order-last">
            <CalendarWidget initialEvents={events} isLoggedIn={isLoggedIn} />
          </aside>
        </div>
      </div>
    </div>
  )
}
