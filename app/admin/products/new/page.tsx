import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NewProductClient from './NewProductClient'

export const metadata: Metadata = {
  title: 'New Product — Admin',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  const supabase = createServiceRoleClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .order('sort_order')
    .order('name')

  return (
    <NewProductClient
      dbCategories={(categories ?? []) as { id: string; name: string; slug: string; icon: string | null }[]}
    />
  )
}
