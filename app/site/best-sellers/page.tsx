import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BestSellersClient from './BestSellersClient'

export const metadata: Metadata = {
  title: 'Best Selling Planners — Most Loved by 50,000+ Customers | Arwign',
  description: 'Shop our best selling digital and printable planners. Customer favourites, highest rated, most downloaded — all in one place. Instant download.',
  alternates: { canonical: 'https://arwignplanners.com/best-sellers' },
  openGraph: {
    title: 'Best Sellers | Arwign Planners',
    description: 'Our most loved planners — top rated, most downloaded, customer favourites.',
  },
}

export default async function BestSellersPage({
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

  // ── Build bestsellers query ───────────────────────────────
  let query = supabase
    .from('products')
    .select('*, category:categories(name, slug)', { count: 'exact' })
    .eq('status', 'active')
    .eq('is_bestseller', true)

  // Optional category filter
  if (searchParams.category) {
    const cat = categories?.find((c) => c.slug === searchParams.category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  // Sort
  switch (searchParams.sort) {
    case 'newest':     query = query.order('created_at',    { ascending: false }); break
    case 'rating':     query = query.order('rating_avg',    { ascending: false }); break
    case 'price-asc':  query = query.order('price',         { ascending: true  }); break
    case 'price-desc': query = query.order('price',         { ascending: false }); break
    default:           query = query.order('download_count', { ascending: false })
  }

  const page    = Math.max(1, parseInt(searchParams.page ?? '1'))
  const perPage = 24
  query = query.range((page - 1) * perPage, page * perPage - 1)

  const { data: products, count } = await query.then((r) => ({
    data:  r.error ? [] : r.data,
    count: r.error ? 0  : r.count,
  }))

  // ── Top stats across ALL bestsellers ─────────────────────
  const { data: stats } = await supabase
    .from('products')
    .select('download_count, rating_avg, rating_count')
    .eq('status', 'active')
    .eq('is_bestseller', true)
    .then((r) => ({ data: r.error ? [] : r.data }))

  const totalDownloads = stats?.reduce((s, p) => s + (p.download_count ?? 0), 0) ?? 0
  const avgRating = stats?.length
    ? (stats.reduce((s, p) => s + (p.rating_avg ?? 0), 0) / stats.length).toFixed(1)
    : '4.9'

  return (
    <BestSellersClient
      initialProducts={products ?? []}
      totalCount={count ?? 0}
      categories={categories ?? []}
      currentPage={page}
      searchParams={searchParams}
      totalDownloads={totalDownloads}
      avgRating={avgRating}
    />
  )
}
