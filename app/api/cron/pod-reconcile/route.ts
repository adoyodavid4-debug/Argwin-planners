/**
 * Polls Lulu for non-terminal orders to catch missed webhooks.
 * Runs every 30 min via Vercel Cron.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFulfillmentProvider } from '@/lib/fulfillment'

const TERMINAL = new Set(['delivered', 'rejected', 'canceled', 'error'])

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase  = createServiceRoleClient()
  const provider  = getFulfillmentProvider()
  let updated = 0
  let errors  = 0

  const { data: orders } = await supabase
    .from('physical_orders')
    .select('id, provider_job_id, fulfillment_status')
    .not('provider_job_id', 'is', null)
    .not('fulfillment_status', 'in', '("delivered","rejected","canceled","error")')
    .limit(50)

  for (const order of (orders ?? [])) {
    if (TERMINAL.has(order.fulfillment_status)) continue
    try {
      const latest = await provider.getPrintJobStatus(order.provider_job_id)
      if (latest.status !== order.fulfillment_status) {
        await supabase.rpc('advance_fulfillment_status', {
          p_physical_order_id: order.id,
          p_new_status:        latest.status,
          p_payload: {
            tracking_url:    latest.trackingUrl ?? null,
            tracking_number: latest.trackingNumber ?? null,
          },
          p_source: 'poll',
        })
        updated++
      }
    } catch (err) {
      console.error('[pod-reconcile] order', order.id, err)
      errors++
    }
  }

  return NextResponse.json({ updated, errors, checked: (orders ?? []).length })
}
