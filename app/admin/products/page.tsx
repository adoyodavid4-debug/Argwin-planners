import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProductsTable from './ProductsTable'

export const metadata: Metadata = {
  title: 'Products — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminProductsPage() {
  const supabase = createServiceRoleClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, slug, status, price, currency, thumbnail, is_featured, is_bestseller, is_new, delivery_type, product_type, fulfillment_options, tags, rating_avg, rating_count, download_count, created_at, updated_at, categories(name, slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

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
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Products</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
              {products?.length ?? 0}
            </span>
          </div>
          <Link
            href="/admin/products/new"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--gold)' }}
          >
            + New Product
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load products: {error.message}
          </div>
        ) : (
          <ProductsTable
            initialProducts={(products ?? []) as unknown as Product[]}
            categories={(categories ?? []) as Category[]}
          />
        )}
      </div>
    </div>
  )
}

export interface Product {
  id: string
  title: string
  slug: string
  status: 'draft' | 'active' | 'archived'
  price: number
  currency: string
  thumbnail: string | null
  is_featured: boolean
  is_bestseller: boolean
  is_new: boolean
  delivery_type: string
  product_type: string
  fulfillment_options: string
  tags: string[]
  rating_avg: number
  rating_count: number
  download_count: number
  created_at: string
  updated_at: string
  categories: { name: string; slug: string } | null
}

export interface Category {
  id: string
  name: string
  slug: string
}
