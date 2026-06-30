import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CategoryClient from './CategoryClient'

interface Props {
  params: { slug: string }
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServiceRoleClient()
  const { data: cat } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', params.slug)
    .single()

  if (!cat) return { title: 'Not Found' }

  return {
    title: `${cat.name} — Premium Digital & Printable Planners | Arwign`,
    description:
      cat.description ??
      `Shop our full collection of ${cat.name}. Instant download, PDF & GoodNotes ready. Designed for productivity.`,
    alternates: { canonical: `https://arwignplanners.com/shop/category/${params.slug}` },
    openGraph: {
      title: `${cat.name} | Arwign Planners`,
      description: cat.description ?? `Premium ${cat.name} — instant download.`,
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const supabase = createServiceRoleClient()

  // ── Fetch category ────────────────────────────────────────
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!category) notFound()

  // ── Fetch the full active product set for this category ───
  //    (client handles filtering / sorting / pagination for
  //     an instant, no-reload experience). Capped for safety.
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('status', 'active')
    .eq('category_id', category.id)
    .order('display_order', { ascending: true, nullsFirst: false })
    .limit(200)
    .then((r) => ({ data: r.error ? [] : r.data }))

  // ── Related categories ────────────────────────────────────
  const { data: relatedCategories } = await supabase
    .from('categories')
    .select('*')
    .neq('slug', params.slug)
    .eq('is_featured', true)
    .order('sort_order')
    .limit(8)
    .then((r) => ({ data: r.error ? [] : r.data }))

  return (
    <CategoryClient
      category={category}
      products={products ?? []}
      relatedCategories={relatedCategories ?? []}
    />
  )
}
