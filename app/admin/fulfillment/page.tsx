import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import FulfillmentQueueClient from './FulfillmentQueueClient'

export const metadata: Metadata = { title: 'Fulfillment Queue — Admin', robots: { index: false, follow: false } }

export default async function FulfillmentQueuePage() {
  const supabase = createServiceRoleClient()

  const { data: orders, error } = await supabase
    .from('physical_orders')
    .select(`
      id, fulfillment_status, shipping_address, shipping_level,
      shipping_cost, subtotal, total, currency, provider,
      provider_job_id, tracking_url, tracking_number,
      failure_reason, created_at,
      orders(email, amount_total),
      fulfillment_events(status, source, created_at)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Fulfillment Queue</h1>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          <strong>Migration pending.</strong> Apply <code>006_pod_schema.sql</code> in the Supabase SQL editor to enable this feature.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Fulfillment Queue
        <span className="text-base font-normal text-[var(--text-muted)] ml-2">
          ({orders?.filter((o) => o.fulfillment_status === 'pending_review').length ?? 0} pending review)
        </span>
      </h1>
      <FulfillmentQueueClient orders={(orders ?? []) as unknown as FulfillmentOrder[]} />
    </div>
  )
}

export interface FulfillmentOrder {
  id: string
  fulfillment_status: string
  shipping_address: Record<string, string>
  shipping_level: string
  shipping_cost: number
  subtotal: number
  total: number
  currency: string
  provider: string
  provider_job_id: string | null
  tracking_url: string | null
  tracking_number: string | null
  failure_reason: string | null
  created_at: string
  orders: { email: string; amount_total: number } | null
  fulfillment_events: { status: string; source: string; created_at: string }[]
}
