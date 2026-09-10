// app/site/page.tsx — homepage
// Layout: main column (Best Sellers on top, Catalogue beneath) with the
// Arwign Calendar as a sticky right sidebar (stacks on top on mobile).
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Crown } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ProductCard from '@/components/shop/ProductCard'
import CalendarPromo from './_home/CalendarPromo'
import type { Product } from '@/types/database'

export const metadata: Metadata = {
  title: 'Arwign Planners — Premium Digital & Printable Planners',
  description: 'Shop premium digital planners, printable planners, budget trackers, habit trackers, wellness planners, and ADHD planners. Instant download. GoodNotes ready.',
  alternates: { canonical: 'https://www.arwignplanners.com' },
}

const SELECT = '*, category:categories(name, slug)'

// Best sellers — flagged first, falling back to most-downloaded so the row is
// never empty.
async function getBestSellers() {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('products').select(SELECT)
    .eq('status', 'active').eq('is_bestseller', true)
    .order('download_count', { ascending: false }).limit(6)
  if (data && data.length > 0) return data as Product[]
  const { data: top } = await supabase
    .from('products').select(SELECT)
    .eq('status', 'active')
    .order('download_count', { ascending: false }).limit(6)
  return (top ?? []) as Product[]
}

// Catalogue — featured planners first, falling back to most-downloaded.
async function getFeatured() {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('products').select(SELECT)
    .eq('status', 'active').eq('is_featured', true)
    .order('download_count', { ascending: false }).limit(12)
  if (data && data.length > 0) return data as Product[]
  const { data: top } = await supabase
    .from('products').select(SELECT)
    .eq('status', 'active')
    .order('download_count', { ascending: false }).limit(12)
  return (top ?? []) as Product[]
}

function SectionHeader({ eyebrow, title, href, linkLabel, icon }: {
  eyebrow: string; title: string; href: string; linkLabel: string; icon?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>{eyebrow}</p>
        <h2 className="font-display text-display-md flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>{icon}{title}</h2>
      </div>
      <Link href={href} className="btn-ghost hidden sm:inline-flex items-center gap-1 text-sm flex-shrink-0">{linkLabel} <ArrowRight size={14} /></Link>
    </div>
  )
}

function Grid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing here yet — check back soon.</p>
      </div>
    )
  }
  // Responsive grid — 2 columns on phones, 3 on desktop (beside the calendar
  // sidebar). With 6 best-sellers that's 2 rows; with 12 catalogue items, 4 rows.
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} priority={i < 3} />
      ))}
    </div>
  )
}

export default async function HomePage() {
  const [bestsellers, featured] = await Promise.all([getBestSellers(), getFeatured()])

  return (
    <div className="container-site py-10 lg:py-14">
      {/* Page-level H1. The homepage is catalogue-first with no hero, so this is
          visually hidden — it still gives assistive tech and search engines the
          single, descriptive top-level heading the page was missing. */}
      <h1 className="sr-only">
        Arwign Planners — premium digital &amp; printable planners, personalised notebooks, and the Arwign calendar
      </h1>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">

        {/* Arwign Calendar — right sidebar on desktop, on top on mobile */}
        <aside className="w-full lg:w-[360px] lg:flex-shrink-0 lg:order-2 lg:sticky lg:top-[calc(var(--nav-height,88px)+16px)]">
          <CalendarPromo />
        </aside>

        {/* Main column — Best Sellers, then Catalogue */}
        <div className="flex-1 min-w-0 lg:order-1 space-y-14">
          <section aria-labelledby="bestsellers-heading">
            <SectionHeader
              eyebrow="Arwigners' Favourite" title="Best Sellers"
              href="/best-sellers" linkLabel="View all"
              icon={<Crown size={22} style={{ color: 'var(--gold)' }} />}
            />
            <div id="bestsellers-heading" className="sr-only">Best Sellers</div>
            <Grid products={bestsellers} />
          </section>

          <section aria-labelledby="catalogue-heading">
            <SectionHeader
              eyebrow="Premium Collection" title="Catalogue"
              href="/shop" linkLabel="Shop all"
            />
            <div id="catalogue-heading" className="sr-only">Catalogue</div>
            <Grid products={featured} />
          </section>
        </div>
      </div>
    </div>
  )
}
