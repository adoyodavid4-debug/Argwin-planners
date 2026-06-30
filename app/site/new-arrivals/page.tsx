import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NewArrivalsClient from './NewArrivalsClient'

export const metadata: Metadata = {
  title: 'New Arrivals — Fresh Digital & Printable Planners | Arwign',
  description: 'Discover the newest digital and printable planners from Arwign. Fresh designs, just dropped — instant download, GoodNotes & Notability ready.',
  alternates: { canonical: 'https://arwignplanners.com/new-arrivals' },
  openGraph: {
    title: 'New Arrivals | Arwign Planners',
    description: 'The latest planners, just dropped. Fresh designs ready for instant download.',
  },
}

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: { sort?: string; category?: string; page?: string }
}) {
  const supabase = createServiceRoleClient()

  // ── Fetch categories for filter pills ────────────────────
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
    .then((r) => ({ data: r.error ? [] : r.data }))

  // ── Build new arrivals query ──────────────────────────────
  let query = supabase
    .from('products')
    .select('*, category:categories(name, slug)', { count: 'exact' })
    .eq('status', 'active')
    .eq('is_new', true)

  // Optional category filter
  if (searchParams.category) {
    const cat = categories?.find((c) => c.slug === searchParams.category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  // Sort — default newest first
  switch (searchParams.sort) {
    case 'popular':     query = query.order('download_count', { ascending: false }); break
    case 'rating':      query = query.order('rating_avg',     { ascending: false }); break
    case 'price-asc':   query = query.order('price',          { ascending: true  }); break
    case 'price-desc':  query = query.order('price',          { ascending: false }); break
    default:            query = query.order('created_at',     { ascending: false })
  }

  const page    = Math.max(1, parseInt(searchParams.page ?? '1'))
  const perPage = 24
  query = query.range((page - 1) * perPage, page * perPage - 1)

  const { data: products, count } = await query.then((r) => ({
    data:  r.error ? [] : r.data,
    count: r.error ? 0  : r.count,
  }))

  // ── Most recently added (for "just dropped" badge) ───────
  const latestDate = products?.[0]?.created_at ?? null

  return (
    <NewArrivalsClient
      initialProducts={products ?? []}
      totalCount={count ?? 0}
      categories={categories ?? []}
      currentPage={page}
      searchParams={searchParams}
      latestDate={latestDate}
    />
  )
}
