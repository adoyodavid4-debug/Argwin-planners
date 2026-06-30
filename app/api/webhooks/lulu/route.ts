import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFulfillmentProvider } from '@/lib/fulfillment'
import { getEmailProvider } from '@/lib/email'

export async function POST(req: NextRequest) {
  const provider = getFulfillmentProvider()
  const result   = await provider.verifyAndParseWebhook(req)

  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find the physical order by provider job id
  const { data: po, error } = await supabase
    .from('physical_orders')
    .select('id, fulfillment_status, user_id, orders(email)')
    .eq('provider_job_id', result.providerJobId)
    .single()

  if (error || !po) {
    console.warn('[lulu-webhook] unknown providerJobId:', result.providerJobId)
    return NextResponse.json({ ok: true }) // 200 to stop retries
  }

  // Advance state machine via the DB function (handles illegal transitions safely)
  const { error: transitionErr } = await supabase.rpc('advance_fulfillment_status', {
    p_physical_order_id: po.id,
    p_new_status:        result.status,
    p_payload: {
      tracking_url:    result.trackingUrl ?? null,
      tracking_number: result.trackingNumber ?? null,
      raw:             result.status,
    },
    p_source: 'webhook',
  })

  if (transitionErr) {
    console.warn('[lulu-webhook] transition rejected:', transitionErr.message)
    // Not an error we should retry — just log it
    return NextResponse.json({ ok: true })
  }

  // Send customer email on shipped or delivered
  const orderEmail = (po.orders as unknown as { email: string } | null)?.email
  if (orderEmail && result.status === 'shipped') {
    try {
      const emailProvider = getEmailProvider()
      await emailProvider.sendTransactional({
        to:           orderEmail,
        locale:       'en',
        templateKey:  'pod.shipped',
        data: {
          tracking_url:    result.trackingUrl ?? '',
          tracking_number: result.trackingNumber ?? '',
          unsub_token:     '',
        },
        idempotencyKey: `${po.id}:shipped`,
      })
    } catch (e) {
      console.error('[lulu-webhook] email failed:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
