import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NewProductClient from './NewProductClient'

export const metadata: Metadata = {
  title: 'New Product — Admin',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  const supabase = createServiceRoleClient()
  const [{ data: categories }, { data: planners }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, icon')
      .order('sort_order')
      .order('name'),
    // Selectable bundle components (bundles filtered out below — is_bundle may be NULL).
    supabase
      .from('products')
      .select('id, title, slug, price, thumbnail, is_bundle, categories(name)')
      .order('title'),
  ])

  const plannerOptions = (planners ?? [])
    .filter((p: any) => !p.is_bundle)
    .map((p: any) => ({
      id: p.id, title: p.title, slug: p.slug, price: p.price ?? 0,
      thumbnail: p.thumbnail ?? null, category: p.categories?.name ?? null,
    }))

  return (
    <NewProductClient
      dbCategories={(categories ?? []) as { id: string; name: string; slug: string; icon: string | null }[]}
      plannerOptions={plannerOptions}
    />
  )
}
