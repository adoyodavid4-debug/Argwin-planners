// components/home/NewArrivals.tsx
// Homepage "New Arrivals" section (server component).
// Owns its own data fetch so the section is self-contained; the carousel and
// cards are split into a client child. Reuses global tokens/utilities only.
import Link from 'next/link'
import { ArrowRight, PackageOpen } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Product } from '@/types/database'
import NewArrivalsCarousel from './NewArrivalsCarousel'

const HEADING_ID = 'new-arrivals-heading'
const VIEW_ALL = '/new-arrivals'

async function getNewArrivals(): Promise<Product[]> {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('status', 'active')
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

// Shared header so the live section and the skeleton stay visually aligned.
function SectionHeader() {
  return (
    <div className="mb-10 flex items-end justify-between gap-6">
      <div>
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}
        >
          Just Landed
        </p>
        <h2 id={HEADING_ID} className="font-display text-display-md" style={{ color: 'var(--text-primary)' }}>
          New Arrivals
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Our newest digital &amp; printable planners — fresh designs, ready for instant download.
        </p>
      </div>
      <Link href={VIEW_ALL} className="btn-ghost hidden shrink-0 items-center gap-1 text-sm sm:flex">
        View all <ArrowRight size={14} />
      </Link>
    </div>
  )
}

export async function NewArrivals() {
  const products = await getNewArrivals()

  return (
    <section className="section w-full" aria-labelledby={HEADING_ID}>
      <div className="container-site">
        <SectionHeader />

        {products.length > 0 ? (
          <>
            <NewArrivalsCarousel products={products} />
            <div className="mt-10 text-center sm:hidden">
              <Link href={VIEW_ALL} className="btn-outline">
                View all new arrivals <ArrowRight size={15} />
              </Link>
            </div>
          </>
        ) : (
          // Graceful empty state.
          <div
            className="flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'rgba(var(--gold-rgb),0.1)' }}
            >
              <PackageOpen size={22} style={{ color: 'var(--gold)' }} />
            </div>
            <p className="mb-1 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Fresh drops are on the way
            </p>
            <p className="mb-6 max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
              No new arrivals just yet — explore the full catalogue while we prepare the next collection.
            </p>
            <Link href="/shop" className="btn-outline">
              Browse the shop <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

// Skeleton placeholder shown while the section streams in (via <Suspense>).
export function NewArrivalsSkeleton() {
  return (
    <section className="section w-full" aria-hidden="true">
      <div className="container-site">
        <SectionHeader />
        <div className="-mx-1 flex gap-5 overflow-hidden px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 basis-[78%] sm:basis-[46%] md:basis-[31.5%] lg:basis-[23.5%]"
            >
              <div
                className="overflow-hidden rounded-[var(--radius-xl)] border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <div className="skeleton" style={{ aspectRatio: '3 / 4' }} />
                <div className="space-y-2 p-4">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-4 w-5/6" />
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton mt-3 h-5 w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default NewArrivals
