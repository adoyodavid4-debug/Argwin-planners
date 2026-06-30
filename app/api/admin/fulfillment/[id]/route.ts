/**
 * Admin fulfillment actions on a physical order:
 *   POST body { action: 'approve' | 'reject', reason?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFulfillmentProvider } from '@/lib/fulfillment'
import type { Address } from '@/lib/fulfillment/types'
import { z } from 'zod'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().min(1) }),
  z.object({ action: z.literal('cancel') }),
])

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()

  const { data: po, error } = await supabase
    .from('physical_orders')
    .select('id, fulfillment_status, provider_job_id, shipping_address, shipping_level, order_id, orders(order_items(product_id, quantity))')
    .eq('id', params.id)
    .single()

  if (error || !po) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (parsed.data.action === 'reject') {
    await supabase.rpc('advance_fulfillment_status', {
      p_physical_order_id: params.id,
      p_new_status:        'rejected',
      p_payload:           { reason: parsed.data.reason },
      p_source:            'admin',
    })
    return NextResponse.json({ ok: true })
  }

  if (parsed.data.action === 'cancel') {
    const provider = getFulfillmentProvider()
    if (po.provider_job_id && provider.cancelPrintJob) {
      await provider.cancelPrintJob(po.provider_job_id).catch(() => {})
    }
    await supabase.rpc('advance_fulfillment_status', {
      p_physical_order_id: params.id,
      p_new_status:        'canceled',
      p_payload:           { source: 'admin' },
      p_source:            'admin',
    })
    return NextResponse.json({ ok: true })
  }

  // action === 'approve' — idempotent createPrintJob
  if (po.fulfillment_status !== 'pending_review') {
    return NextResponse.json({ error: `Order is already ${po.fulfillment_status}` }, { status: 409 })
  }

  // Get print product for this order's items
  const orderItems = (po.orders as unknown as { order_items: { product_id: string; quantity: number }[] } | null)?.order_items ?? []
  if (!orderItems.length) return NextResponse.json({ error: 'No order items found' }, { status: 422 })

  // Find print_products for the order items
  const productIds = orderItems.map((i) => i.product_id)
  const { data: printProducts } = await supabase
    .from('print_products')
    .select('id, product_id')
    .in('product_id', productIds)
    .eq('is_active', true)

  if (!printProducts?.length) {
    return NextResponse.json({ error: 'No active print products found for this order' }, { status: 422 })
  }

  const lineItems = orderItems
    .map((item) => {
      const pp = printProducts.find((p) => p.product_id === item.product_id)
      return pp ? { printProductId: pp.id, quantity: item.quantity } : null
    })
    .filter(Boolean) as { printProductId: string; quantity: number }[]

  const provider = getFulfillmentProvider()

  try {
    const result = await provider.createPrintJob({
      externalId:      po.order_id,
      lineItems,
      shippingAddress: po.shipping_address as Address,
      shippingLevel:   po.shipping_level,
    })

    await supabase
      .from('physical_orders')
      .update({ provider_job_id: result.providerJobId })
      .eq('id', params.id)

    await supabase.rpc('advance_fulfillment_status', {
      p_physical_order_id: params.id,
      p_new_status:        'submitted',
      p_payload:           { provider_job_id: result.providerJobId },
      p_source:            'admin',
    })

    return NextResponse.json({ ok: true, providerJobId: result.providerJobId })
  } catch (err) {
    console.error('[fulfillment approve]', err)
    try {
      await supabase.rpc('advance_fulfillment_status', {
        p_physical_order_id: params.id,
        p_new_status:        'error',
        p_payload:           { reason: String(err) },
        p_source:            'admin',
      })
    } catch { /* best-effort */ }
    return NextResponse.json({ error: 'Failed to submit print job. See fulfillment events for details.' }, { status: 502 })
  }
}
