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

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*, categories(id, name, slug)').eq('id', params.id).single(),
    supabase.from('categories').select('id, name, slug, icon').order('sort_order').order('name'),
  ])

  if (!product) notFound()

  return (
    <EditProductClient
      product={product as any}
      categories={(categories ?? []) as { id: string; name: string; slug: string; icon: string | null }[]}
    />
  )
}
