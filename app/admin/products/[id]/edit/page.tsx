import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import EditProductClient from './EditProductClient'

export const metadata: Metadata = {
  title: 'Edit Product — Admin',
  robots: { index: false, follow: false },
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()

  const [{ data: product }, { data: categories }, { data: planners }] = await Promise.all([
    supabase.from('products').select('*, categories(id, name, slug)').eq('id', params.id).single(),
    supabase.from('categories').select('id, name, slug, icon').order('sort_order').order('name'),
    // Selectable bundle components (bundles filtered out below — is_bundle may be NULL).
    supabase.from('products').select('id, title, slug, price, thumbnail, is_bundle, categories(name)').order('title'),
  ])

  if (!product) notFound()

  const plannerOptions = (planners ?? [])
    .filter((p: any) => !p.is_bundle && p.id !== product.id) // no self, no nested bundles
    .map((p: any) => ({
      id: p.id, title: p.title, slug: p.slug, price: p.price ?? 0,
      thumbnail: p.thumbnail ?? null, category: p.categories?.name ?? null,
    }))

  return (
    <EditProductClient
      product={product as any}
      categories={(categories ?? []) as { id: string; name: string; slug: string; icon: string | null }[]}
      plannerOptions={plannerOptions}
    />
  )
}
