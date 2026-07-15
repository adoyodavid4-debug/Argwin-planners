import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CategoriesClient from './CategoriesClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Shop by Category — Premium Digital & Printable Planners | Arwign',
  description:
    'Browse every Arwign planner collection — digital, printable, budget, student, wellness, habit trackers and more. Instant download, GoodNotes & print ready.',
  alternates: { canonical: 'https://www.arwignplanners.com/shop/category' },
  openGraph: {
    title: 'Shop by Category | Arwign Planners',
    description: 'Find your perfect planner across every Arwign collection — instant download.',
  },
}

export default async function CategoriesIndexPage() {
  const supabase = createServiceRoleClient()

  const [{ data: categories }, { data: productRows }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order').then((r) => ({ data: r.error ? [] : r.data })),
    supabase.from('products').select('category_id').eq('status', 'active').then((r) => ({ data: r.error ? [] : r.data })),
  ])

  // Tally active products per category
  const counts: Record<string, number> = {}
  for (const row of productRows ?? []) {
    if (row.category_id) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
  }

  return (
    <CategoriesClient
      categories={categories ?? []}
      counts={counts}
      totalProducts={(productRows ?? []).length}
    />
  )
}
