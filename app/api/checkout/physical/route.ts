/**
 * Physical checkout — creates a Stripe Payment Intent for the exact quoted total,
 * then on success (via webhook) creates the physical_order in pending_review.
 *
 * Flow: POST /api/checkout/physical
 *   body: { printProductId, quantity, shippingAddress, shippingLevel, shippingCost }
 *   → validates price server-side
 *   → charges exact total via Stripe PaymentIntent
 *   → returns { clientSecret } for Stripe Elements on the client
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { stripe, toCents } from '@/lib/stripe'
import { z } from 'zod'

const addressSchema = z.object({
  name:        z.string().min(1),
  line1:       z.string().min(1),
  line2:       z.string().optional(),
  city:        z.string().min(1),
  state:       z.string().optional(),
  postalCode:  z.string().min(1),
  countryCode: z.string().length(2),
  phone:       z.string().optional(),
  email:       z.string().email(),
})

const schema = z.object({
  printProductId:  z.string().uuid(),
  quantity:        z.number().int().min(1).default(1),
  shippingAddress: addressSchema,
  shippingLevel:   z.string().min(1),
  shippingCost:    z.number().int().min(0),   // quoted cost in minor units — we re-verify
})

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { printProductId, quantity, shippingAddress, shippingLevel, shippingCost } = parsed.data
  const supabase = createServiceRoleClient()

  // Load print product + attached product for margin guard
  const { data: pp, error: ppErr } = await supabase
    .from('print_products')
    .select('id, retail_price, base_cost, currency, min_margin_pct, is_active, products(title, status)')
    .eq('id', printProductId)
    .eq('is_active', true)
    .single()

  if (ppErr || !pp) {
    return NextResponse.json({ error: 'Print product not found or inactive' }, { status: 404 })
  }

  const product = (pp.products as unknown as { title: string; status: string } | null)
  if (product?.status !== 'active') {
    return NextResponse.json({ error: 'Product is not available' }, { status: 400 })
  }

  // Margin guard: retail_price must cover base_cost + shipping floor + min margin
  const subtotal     = pp.retail_price * quantity
  const totalCharging = subtotal + shippingCost
  const minRequired  = Math.ceil(pp.base_cost * quantity * (1 + pp.min_margin_pct / 100))
  if (subtotal < minRequired) {
    return NextResponse.json({
      error: `Retail price too low. Minimum required: ${minRequired} ${pp.currency} (base + ${pp.min_margin_pct}% margin).`,
    }, { status: 422 })
  }

  // Create Stripe PaymentIntent for the exact total
  const intent = await stripe.paymentIntents.create({
    amount:   totalCharging,
    currency: pp.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: {
      type:            'physical',
      print_product_id: printProductId,
      quantity:         String(quantity),
      shipping_level:   shippingLevel,
      shipping_cost:    String(shippingCost),
      shipping_address: JSON.stringify(shippingAddress),
    },
    shipping: {
      name:    shippingAddress.name,
      phone:   shippingAddress.phone ?? '',
      address: {
        line1:       shippingAddress.line1,
        line2:       shippingAddress.line2 ?? '',
        city:        shippingAddress.city,
        state:       shippingAddress.state ?? '',
        postal_code: shippingAddress.postalCode,
        country:     shippingAddress.countryCode,
      },
    },
  })

  return NextResponse.json({
    clientSecret: intent.client_secret,
    subtotal,
    shippingCost,
    total: totalCharging,
    currency: pp.currency,
    productTitle: product?.title,
  })
}
