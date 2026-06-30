// app/site/shop/page.tsx
import type { Metadata } from 'next'
import ShopClient from './ShopClient'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Shop All Digital & Printable Planners',
  description: 'Browse our full collection of premium digital planners, printable planners, budget trackers, habit trackers, and wellness planners. Instant download.',
  alternates: { canonical: 'https://arwignplanners.com/shop' },
  openGraph: {
    title: 'Shop Premium Planners — Arwign Planners',
    description: 'Download premium digital and printable planners. GoodNotes, iPad, PDF ready.',
    url: 'https://arwignplanners.com/shop',
  },
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string; q?: string; page?: string }
}) {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('products')
    .select('*, category:categories(name, slug)', { count: 'exact' })
    .eq('status', 'active')

  // Filter by category
  if (searchParams.category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', searchParams.category)
      .single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  // Search
  if (searchParams.q) {
    query = query.textSearch('title', searchParams.q, { type: 'websearch' })
  }

  // Sort
  switch (searchParams.sort) {
    case 'price-asc':    query = query.order('price', { ascending: true });  break
    case 'price-desc':   query = query.order('price', { ascending: false }); break
    case 'newest':       query = query.order('created_at', { ascending: false }); break
    case 'rating':       query = query.order('rating_avg', { ascending: false }); break
    default:             query = query.order('download_count', { ascending: false })
  }

  // Pagination
  const page    = Math.max(1, parseInt(searchParams.page ?? '1'))
  const perPage = 24
  query = query.range((page - 1) * perPage, page * perPage - 1)

  const { data: products, count } = await query.then((r) => ({
    data: r.error ? [] : r.data,
    count: r.error ? 0   : r.count,
  }))

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
    .then((r) => ({ data: r.error ? [] : r.data }))

  return (
    <ShopClient
      initialProducts={products ?? []}
      totalCount={count ?? 0}
      categories={categories ?? []}
      currentPage={page}
      searchParams={searchParams}
    />
  )
}
