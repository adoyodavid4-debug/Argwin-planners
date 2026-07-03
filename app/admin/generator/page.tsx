import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import GeneratorClient from './GeneratorClient'

export const metadata: Metadata = {
  title: 'Planner Generator — Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminGeneratorPage() {
  const supabase = createServiceRoleClient()

  const { data: templates, error } = await supabase
    .from('planner_templates')
    .select('id, name, slug, description, template_key, accent_hex, price, compare_price, category_slug, page_count, is_active, sort_order, last_generated_at, product_id, product:product_id(id, slug, status)')
    .order('sort_order', { ascending: true })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Planner Generator</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
              {templates?.length ?? 0}
            </span>
          </div>
          <Link
            href="/admin/products"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            All products →
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load planner templates: {error.message}
            <p className="mt-2 text-xs text-red-500">
              If the table does not exist yet, run migration <code>supabase/migrations/013_complete_platform.sql</code>.
            </p>
          </div>
        ) : (
          <GeneratorClient initialTemplates={(templates ?? []) as unknown as GeneratorTemplate[]} />
        )}
      </div>
    </div>
  )
}

export interface GeneratorTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  template_key: string
  accent_hex: string | null
  price: number
  compare_price: number | null
  category_slug: string
  page_count: number | null
  is_active: boolean
  sort_order: number
  last_generated_at: string | null
  product_id: string | null
  product: { id: string; slug: string; status: string } | null
}
