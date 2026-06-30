import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'

export const metadata: Metadata = {
  title: 'Orders — Admin',
  robots: { index: false, follow: false },
}

export interface Order {
  id: string
  email: string
  status: 'pending' | 'processing' | 'completed' | 'refunded' | 'cancelled'
  payment_method: string | null
  amount_subtotal: number
  amount_discount: number
  amount_total: number
  currency: string
  coupon_code: string | null
  created_at: string
  updated_at: string
  item_count: number
}

export default async function AdminOrdersPage() {
  const supabase = createServiceRoleClient()

  const { data: raw, error } = await supabase
    .from('orders')
    .select('id, email, status, payment_method, amount_subtotal, amount_discount, amount_total, currency, coupon_code, created_at, updated_at, order_items(id)')
    .order('created_at', { ascending: false })
    .limit(500)

  const orders: Order[] = (raw ?? []).map((o: any) => ({
    id:               o.id,
    email:            o.email,
    status:           o.status,
    payment_method:   o.payment_method,
    amount_subtotal:  o.amount_subtotal,
    amount_discount:  o.amount_discount,
    amount_total:     o.amount_total,
    currency:         o.currency,
    coupon_code:      o.coupon_code,
    created_at:       o.created_at,
    updated_at:       o.updated_at,
    item_count:       Array.isArray(o.order_items) ? o.order_items.length : 0,
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Orders</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
              {orders.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load orders: {error.message}
          </div>
        ) : (
          <OrdersClient initialOrders={orders} />
        )}
      </div>
    </div>
  )
}
