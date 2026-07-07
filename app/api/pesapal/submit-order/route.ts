// app/api/pesapal/submit-order/route.ts
// Validates cart prices server-side (like /api/checkout), creates a pending
// `orders` row, then submits the order to PesaPal for a hosted Visa/Mastercard
// payment page. Mirrors app/api/paypal/create-order/route.ts.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getIpnId, submitOrderRequest } from '@/lib/pesapal'
import { z } from 'zod'

const schema = z.object({
  items: z.array(z.object({
    id:    z.string().uuid(),
    slug:  z.string(),
    title: z.string(),
    price: z.number().positive(),
  })).min(1),
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { items, email } = parsed.data
  const supabase = createServerSupabaseClient()

  // Verify products exist and prices match — never trust client prices
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, price, status')
    .in('id', items.map((i) => i.id))

  if (error || !products) {
    return NextResponse.json({ error: 'Product lookup failed' }, { status: 500 })
  }

  for (const item of items) {
    const db = products.find((p) => p.id === item.id)
    if (!db) return NextResponse.json({ error: `Product not found: ${item.id}` }, { status: 400 })
    if (db.status !== 'active') return NextResponse.json({ error: `Product unavailable: ${item.title}` }, { status: 400 })
    if (Math.abs(db.price - item.price) > 0.01) {
      return NextResponse.json({ error: 'Price mismatch detected' }, { status: 400 })
    }
  }

  const total  = products.reduce((sum, p) => sum + p.price, 0)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get('origin') ?? 'http://localhost:3000'

  // Create the pending order (service role — bypasses RLS in API routes)
  const service = createServiceRoleClient()
  const { data: order, error: orderErr } = await service
    .from('orders')
    .insert({
      email,
      status:          'pending',
      payment_method:  'pesapal',
      amount_subtotal: total,
      amount_discount: 0,
      amount_total:    total,
      currency:        'usd',
    })
    .select('id')
    .single()

  if (orderErr || !order) {
    console.error('[pesapal/submit-order] order insert failed:', orderErr)
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
  }

  await service.from('order_items').insert(
    products.map((p) => ({
      order_id:   order.id,
      product_id: p.id,
      title:      p.title,
      price:      p.price,
      quantity:   1,
    }))
  )

  try {
    const notificationId = await getIpnId(`${appUrl}/api/pesapal/callback`)

    const pesapalOrder = await submitOrderRequest({
      merchantReference: order.id,
      amount:            total,
      description:       `Arwign x${products.length}`,
      callbackUrl:        `${appUrl}/checkout/pesapal/return?order=${order.id}`,
      notificationId,
      billingEmail:       email,
    })

    await service
      .from('orders')
      .update({
        metadata: { pesapal_order_tracking_id: pesapalOrder.order_tracking_id },
      })
      .eq('id', order.id)

    return NextResponse.json({ redirectUrl: pesapalOrder.redirect_url, orderId: order.id })
  } catch (err) {
    console.error('[pesapal/submit-order]', err)
    // Roll back the pending order so we don't accumulate orphans
    await service.from('order_items').delete().eq('order_id', order.id)
    await service.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Could not start PesaPal checkout. Please try again.' }, { status: 502 })
  }
}
