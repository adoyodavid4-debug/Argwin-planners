import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CategoryClient from './CategoryClient'

interface Props {
  params:       { slug: string }
  searchParams: { sort?: string; format?: string; price?: string; page?: string }
}

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

export default async function CategoryPage({ params, searchParams }: Props) {
  const supabase = createServiceRoleClient()

  // ── Fetch category ────────────────────────────────────────
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!category) notFound()

  // ── Build products query ──────────────────────────────────
  let query = supabase
    .from('products')
    .select('*, display_order, category:categories(name, slug)', { count: 'exact' })
    .eq('status', 'active')
    .eq('category_id', category.id)

  if (searchParams.format) {
    query = query.contains('file_formats', [searchParams.format])
  }

  if (searchParams.price === 'under-10') {
    query = query.lt('price', 10)
  } else if (searchParams.price === '10-20') {
    query = query.gte('price', 10).lte('price', 20)
  } else if (searchParams.price === 'over-20') {
    query = query.gt('price', 20)
  }

  switch (searchParams.sort) {
    case 'newest':     query = query.order('created_at',    { ascending: false }); break
    case 'rating':     query = query.order('rating_avg',    { ascending: false }); break
    case 'price-asc':  query = query.order('price',         { ascending: true  }); break
    case 'price-desc': query = query.order('price',         { ascending: false }); break
    default:           query = query.order('display_order', { ascending: true, nullsFirst: false })
  }

  const page    = Math.max(1, parseInt(searchParams.page ?? '1'))
  const perPage = 24
  query = query.range((page - 1) * perPage, page * perPage - 1)

  const { data: products, count } = await query.then((r) => ({
    data:  r.error ? [] : r.data,
    count: r.error ? 0  : r.count,
  }))

  // ── Related categories ────────────────────────────────────
  const { data: relatedCategories } = await supabase
    .from('categories')
    .select('*')
    .neq('slug', params.slug)
    .eq('is_featured', true)
    .order('sort_order')
    .limit(6)
    .then((r) => ({ data: r.error ? [] : r.data }))

  return (
    <CategoryClient
      category={category}
      initialProducts={products ?? []}
      totalCount={count ?? 0}
      relatedCategories={relatedCategories ?? []}
      currentPage={page}
      searchParams={searchParams}
    />
  )
}
