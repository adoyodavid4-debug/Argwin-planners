// app/api/paypal/capture/route.ts
// Captures an approved PayPal order, verifies status + amount, marks the
// order completed, generates download tokens and sends the invoice email.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { capturePayPalOrder } from '@/lib/paypal'
import { fulfilDigitalOrder } from '@/lib/orders'
import { makeRateLimiter, clientIp } from '@/lib/rate-limit'
import { captureError } from '@/lib/error-tracking'
import { z } from 'zod'

const schema = z.object({
  orderID: z.string().min(1),   // PayPal order id (from the JS SDK onApprove)
})

// Cap capture attempts per IP (15 / minute) — legit users may double-click, but
// this blocks brute-forcing order ids.
const isRateLimited = makeRateLimiter(15, 60_000)

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { orderID } = parsed.data
  const supabase = createServiceRoleClient()

  // Find our pending order for this PayPal order
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, amount_total, metadata')
    .eq('paypal_order_id', orderID)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Already captured (double click / retry) — just return the order id
  if (order.status === 'completed') {
    await fulfilDigitalOrder(supabase, order.id)
    return NextResponse.json({ orderId: order.id })
  }

  let capture
  try {
    capture = await capturePayPalOrder(orderID)
  } catch (err) {
    const issue = (err as Error & { issue?: string }).issue
    if (issue === 'ORDER_ALREADY_CAPTURED') {
      // Someone captured it already — trust PayPal, complete our side
      capture = { id: orderID, status: 'COMPLETED' }
    } else {
      console.error('[paypal/capture]', err)
      return NextResponse.json({ error: 'Payment could not be captured. You have not been charged twice — please try again.' }, { status: 502 })
    }
  }

  if (capture.status !== 'COMPLETED') {
    console.error('[paypal/capture] unexpected status:', capture.status, orderID)
    return NextResponse.json({ error: `Payment not completed (status: ${capture.status})` }, { status: 402 })
  }

  // Verify the captured amount matches what we charged for
  const capturedValue = (capture as any)?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
  if (capturedValue != null && Math.abs(parseFloat(capturedValue) - order.amount_total) > 0.01) {
    await captureError('PayPal captured amount does not match order total', {
      source: 'api/paypal/capture',
      extra: { orderId: order.id, paypalOrderId: orderID, captured: capturedValue, expected: order.amount_total },
      alwaysAlert: true,
    })
    return NextResponse.json({ error: 'Payment amount mismatch — please contact support.' }, { status: 409 })
  }

  const captureId = (capture as any)?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null

  // Mark completed (DB trigger assigns the invoice number)
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status:   'completed',
      metadata: {
        ...((order.metadata as Record<string, unknown> | null) ?? {}),
        paypal_capture_id: captureId,
      },
    })
    .eq('id', order.id)

  if (updateErr) {
    await captureError('Payment captured but order update failed — customer charged, fulfilment blocked', {
      source: 'api/paypal/capture',
      extra: { orderId: order.id, paypalOrderId: orderID, captureId, dbError: updateErr.message },
      alwaysAlert: true,
    })
    return NextResponse.json({ error: 'Payment captured but order update failed — contact support.' }, { status: 500 })
  }

  // Download tokens + invoice email (email failures are swallowed inside)
  await fulfilDigitalOrder(supabase, order.id)

  return NextResponse.json({ orderId: order.id })
}
