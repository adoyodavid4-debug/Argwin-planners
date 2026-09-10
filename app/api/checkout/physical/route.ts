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
import { getFulfillmentProvider, type Address } from '@/lib/fulfillment'
import { makeRateLimiter, clientIp } from '@/lib/rate-limit'
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
  shippingCost:    z.number().int().min(0),   // client's quoted cost (minor units) — re-verified server-side below
})

// Cap physical-checkout intents per IP (10 / minute) — each creates a Stripe
// PaymentIntent.
const isRateLimited = makeRateLimiter(10, 60_000)

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

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

  // Re-quote shipping server-side. NEVER trust the client's shippingCost — a
  // tampered `shippingCost: 0` would otherwise let the buyer pay retail only
  // while we eat the real Lulu fee. We charge the provider's authoritative cost
  // for the chosen level, and reject if the client's quote has materially
  // drifted so the shopper re-confirms the real total.
  let verifiedShipping: number
  try {
    const quotes = await getFulfillmentProvider().getShippingQuotes({
      lineItems: [{ printProductId, quantity }],
      shippingAddress: shippingAddress as Address,
    })
    const match = quotes.find((q) => q.level === shippingLevel)
    if (!match) {
      return NextResponse.json({ error: 'That shipping option is no longer available — please refresh and try again.' }, { status: 409 })
    }
    verifiedShipping = match.cost
  } catch (e) {
    console.error('[checkout/physical] shipping re-quote failed', e)
    return NextResponse.json({ error: 'Could not verify shipping right now. Please try again.' }, { status: 502 })
  }
  // Tolerate ±1 minor unit of rounding; anything larger means the price changed.
  if (Math.abs(verifiedShipping - shippingCost) > 1) {
    return NextResponse.json({
      error: 'Shipping price changed since you started checkout. Please review the updated total.',
      shippingCost: verifiedShipping,
    }, { status: 409 })
  }

  // Margin guard: retail_price must cover base_cost + shipping floor + min margin
  const subtotal     = pp.retail_price * quantity
  const totalCharging = subtotal + verifiedShipping
  const minRequired  = Math.ceil(pp.base_cost * quantity * (1 + pp.min_margin_pct / 100))
  if (subtotal < minRequired) {
    return NextResponse.json({
      error: `Retail price too low. Minimum required: ${minRequired} ${pp.currency} (base + ${pp.min_margin_pct}% margin).`,
    }, { status: 422 })
  }

  // Create Stripe PaymentIntent for the exact server-verified total
  const intent = await stripe.paymentIntents.create({
    amount:   totalCharging,
    currency: pp.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: {
      type:            'physical',
      print_product_id: printProductId,
      quantity:         String(quantity),
      shipping_level:   shippingLevel,
      shipping_cost:    String(verifiedShipping),
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
    shippingCost: verifiedShipping,
    total: totalCharging,
    currency: pp.currency,
    productTitle: product?.title,
  })
}
