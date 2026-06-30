import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NewArrivalsClient, { type RelItem } from './NewArrivalsClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'New Arrivals — Fresh Digital & Printable Planners | Arwign',
  description: 'Discover the newest digital and printable planners from Arwign. Fresh designs, just dropped — instant download, GoodNotes & Notability ready.',
  alternates: { canonical: 'https://arwignplanners.com/new-arrivals' },
  openGraph: {
    title: 'New Arrivals | Arwign Planners',
    description: 'The latest planners, just dropped. Fresh designs ready for instant download.',
  },
}

export default async function NewArrivalsPage() {
  const supabase = createServiceRoleClient()

  const [{ data: categories }, { data: products }, { data: related }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order').then((r) => ({ data: r.error ? [] : r.data })),
    supabase
      .from('products')
      .select('*, category:categories(name, slug)')
      .eq('status', 'active')
      .eq('is_new', true)
      .order('created_at', { ascending: false })
      .limit(100)
      .then((r) => ({ data: r.error ? [] : r.data })),
    supabase
      .from('products')
      .select('id, title, slug, price, currency, thumbnail')
      .eq('status', 'active')
      .eq('is_bestseller', true)
      .order('download_count', { ascending: false })
      .limit(8)
      .then((r) => ({ data: r.error ? [] : r.data })),
  ])

  const items = (products ?? []) as any[]
  const newIds = new Set(items.map((p) => p.id))
  const relatedItems: RelItem[] = (related ?? [])
    .filter((p: any) => !newIds.has(p.id))
    .map((p: any) => ({ id: p.id, title: p.title, slug: p.slug, price: p.price, currency: p.currency, thumbnail: p.thumbnail }))

  // categories that actually have a new arrival
  const presentSlugs = new Set(items.map((p) => p.category?.slug).filter(Boolean))
  const usedCategories = (categories ?? []).filter((c) => presentSlugs.has(c.slug))

  return (
    <NewArrivalsClient
      products={items}
      categories={usedCategories}
      related={relatedItems}
      latestDate={items[0]?.created_at ?? null}
    />
  )
}
