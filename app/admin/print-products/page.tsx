import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import PrintProductsClient from './PrintProductsClient'

export const metadata: Metadata = { title: 'Print Products — Admin', robots: { index: false, follow: false } }

export default async function PrintProductsPage() {
  const supabase = createServiceRoleClient()

  const [{ data: printProducts, error }, { data: products }] = await Promise.all([
    supabase
      .from('print_products')
      .select('*, products(id, title, slug, status)')
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('id, title, slug, status')
      .in('fulfillment_options', ['print', 'both'])
      .eq('status', 'active')
      .order('title'),
  ])

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Print Products</h1>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          <strong>Migration pending.</strong> Apply <code>006_pod_schema.sql</code> in the Supabase SQL editor to enable this feature.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Print Products</h1>
      <PrintProductsClient
        printProducts={(printProducts ?? []) as unknown as PrintProductRow[]}
        products={(products ?? []) as { id: string; title: string; slug: string; status: string }[]}
      />
    </div>
  )
}

export interface PrintProductRow {
  id: string
  product_id: string
  provider: string
  pod_package_id: string
  interior_pdf_url: string
  cover_pdf_url: string
  base_cost: number
  retail_price: number
  currency: string
  min_margin_pct: number
  is_active: boolean
  created_at: string
  products: { id: string; title: string; slug: string; status: string } | null
}
