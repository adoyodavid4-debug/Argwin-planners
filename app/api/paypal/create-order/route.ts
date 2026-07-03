// app/api/paypal/create-order/route.ts
// Validates cart prices server-side (like /api/checkout), creates a pending
// `orders` row, then creates the PayPal order for the DB-validated total.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createPayPalOrder } from '@/lib/paypal'
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

  const total = products.reduce((sum, p) => sum + p.price, 0)

  // Create the pending order (service role — bypasses RLS in API routes)
  const service = createServiceRoleClient()
  const { data: order, error: orderErr } = await service
    .from('orders')
    .insert({
      email,
      status:          'pending',
      payment_method:  'paypal',
      amount_subtotal: total,
      amount_discount: 0,
      amount_total:    total,
      currency:        'usd',
    })
    .select('id')
    .single()

  if (orderErr || !order) {
    console.error('[paypal/create-order] order insert failed:', orderErr)
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

  // Create the PayPal order with the DB-validated total
  try {
    const paypalOrder = await createPayPalOrder({
      referenceId: order.id,
      total,
      items: products.map((p) => ({ title: p.title, price: p.price, quantity: 1 })),
    })

    await service
      .from('orders')
      .update({ paypal_order_id: paypalOrder.id })
      .eq('id', order.id)

    return NextResponse.json({ id: paypalOrder.id })
  } catch (err) {
    console.error('[paypal/create-order]', err)
    // Roll back the pending order so we don't accumulate orphans
    await service.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Could not start PayPal checkout. Please try again.' }, { status: 502 })
  }
}
