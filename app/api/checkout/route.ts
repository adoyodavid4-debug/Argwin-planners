// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, toCents } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  items: z.array(z.object({
    id:    z.string().uuid(),
    slug:  z.string(),
    title: z.string(),
    price: z.number().positive(),
  })).min(1),
  coupon_code: z.string().optional(),
  email:       z.string().email().optional(),
})

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { items, coupon_code, email } = parsed.data
  const supabase = createServerSupabaseClient()

  // Verify products exist and prices match (server-side validation — never trust client prices)
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, price, status')
    .in('id', items.map((i) => i.id))

  if (error || !products) {
    return NextResponse.json({ error: 'Product lookup failed' }, { status: 500 })
  }

  // Validate prices server-side
  for (const item of items) {
    const db = products.find((p) => p.id === item.id)
    if (!db) return NextResponse.json({ error: `Product not found: ${item.id}` }, { status: 400 })
    if (db.status !== 'active') return NextResponse.json({ error: `Product unavailable: ${item.title}` }, { status: 400 })
    if (Math.abs(db.price - item.price) > 0.01) {
      return NextResponse.json({ error: 'Price mismatch detected' }, { status: 400 })
    }
  }

  // Validate coupon if provided
  let stripeCouponId: string | undefined
  if (coupon_code) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', coupon_code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (coupon) {
      const now = new Date()
      const expired = coupon.expires_at && new Date(coupon.expires_at) < now
      const maxed   = coupon.max_uses && coupon.used_count >= coupon.max_uses
      if (!expired && !maxed) {
        // In production: create Stripe coupon or apply discount manually
        // For now we handle discount in metadata
        stripeCouponId = coupon.id
      }
    }
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL

  const session = await createCheckoutSession({
    lineItems: products.map((p) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name:        p.title,
          description: 'Instant digital download — PDF & compatible formats',
        },
        unit_amount: toCents(p.price),
      },
      quantity: 1,
    })),
    successUrl:    `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl:     `${origin}/checkout/cancel`,
    customerEmail: email,
    metadata: {
      product_ids: items.map((i) => i.id).join(','),
      coupon_code: coupon_code || '',
    },
  })

  return NextResponse.json({ url: session.url })
}
