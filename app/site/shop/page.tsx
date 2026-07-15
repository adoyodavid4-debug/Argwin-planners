// app/site/shop/page.tsx
import type { Metadata } from 'next'
import ShopClient from './ShopClient'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'

const BASE = 'https://www.arwignplanners.com'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Shop All Digital & Printable Planners',
  description: 'Browse our full collection of premium digital planners, printable planners, budget trackers, habit trackers, and wellness planners. Instant download.',
  alternates: { canonical: 'https://www.arwignplanners.com/shop' },
  openGraph: {
    title: 'Shop Premium Planners — Arwign Planners',
    description: 'Download premium digital and printable planners. GoodNotes, iPad, PDF ready.',
    url: 'https://www.arwignplanners.com/shop',
  },
}

export default async function ShopPage() {
  const supabase = createServiceRoleClient()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, category:categories(name, slug)')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('download_count', { ascending: false })
      .limit(200)
      .then((r) => ({ data: r.error ? [] : r.data })),
    supabase.from('categories').select('*').order('sort_order').then((r) => ({ data: r.error ? [] : r.data })),
  ])

  const items = (products ?? []) as any[]
  // categories that actually have products
  const present = new Set(items.map((p) => p.category?.slug).filter(Boolean))
  const usedCategories = (categories ?? []).filter((c) => present.has(c.slug))
  const featured = items.filter((p) => p.is_bestseller).slice(0, 10)

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: BASE },
        { name: 'Shop', url: `${BASE}/site/shop` },
      ]} />
      <ShopClient products={items} categories={usedCategories} featured={featured} />
    </>
  )
}
