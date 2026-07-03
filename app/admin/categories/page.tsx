import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CategoriesClient from './CategoriesClient'
import type { Category } from '@/types/database'

export const metadata: Metadata = {
  title: 'Categories — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminCategoriesPage() {
  const supabase = createServiceRoleClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← Dashboard
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Categories</h1>
          <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
            {categories?.length ?? 0}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load categories: {error.message}
          </div>
        ) : (
          <CategoriesClient initialCategories={(categories ?? []) as Category[]} />
        )}
      </div>
    </div>
  )
}
