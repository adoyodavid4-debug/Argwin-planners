import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing — Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminPricingPage() {
  const supabase = createServiceRoleClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, slug, status, product_type, price, compare_price, currency, thumbnail, categories(name)')
    .order('title', { ascending: true })
    .limit(500)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Pricing</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
              {products?.length ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Update the price of any item, then save. &ldquo;Compare-at&rdquo; is the old/original price shown
          crossed out on the shop — leave it empty for no sale badge.
        </p>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load products: {error.message}
          </div>
        ) : (
          <PricingClient initialProducts={(products ?? []) as unknown as PricingProduct[]} />
        )}
      </div>
    </div>
  )
}

export interface PricingProduct {
  id: string
  title: string
  slug: string
  status: 'draft' | 'active' | 'archived'
  product_type: string | null
  price: number
  compare_price: number | null
  currency: string | null
  thumbnail: string | null
  categories: { name: string } | null
}
