import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BestSellersClient from './BestSellersClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Best Selling Planners — Most Loved by 50,000+ Customers | Arwign',
  description: 'Shop our best selling digital and printable planners. Customer favourites, highest rated, most downloaded — all in one place. Instant download.',
  alternates: { canonical: 'https://arwignplanners.com/best-sellers' },
  openGraph: {
    title: 'Best Sellers | Arwign Planners',
    description: 'Our most loved planners — top rated, most downloaded, customer favourites.',
  },
}

export default async function BestSellersPage() {
  const supabase = createServiceRoleClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('status', 'active')
    .eq('is_bestseller', true)
    .order('download_count', { ascending: false })
    .limit(100)
    .then((r) => ({ data: r.error ? [] : r.data }))

  const items = (products ?? []) as any[]
  const totalDownloads = items.reduce((s, p) => s + (p.download_count ?? 0), 0)
  const totalReviews = items.reduce((s, p) => s + (p.rating_count ?? 0), 0)
  const rated = items.filter((p) => p.rating_avg > 0)
  const avgRating = rated.length ? (rated.reduce((s, p) => s + p.rating_avg, 0) / rated.length) : 4.9

  return (
    <BestSellersClient
      products={items}
      totalDownloads={totalDownloads}
      totalReviews={totalReviews}
      avgRating={avgRating}
    />
  )
}
