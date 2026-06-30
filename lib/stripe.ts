// lib/stripe.ts
import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

// ─── Create Payment Intent ─────────────────────────────────
export async function createPaymentIntent({
  amount,        // in cents
  currency = 'usd',
  metadata,
}: {
  amount: number
  currency?: string
  metadata?: Record<string, string>
}) {
  return stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true },  // enables Apple Pay / Google Pay automatically
    metadata,
  })
}

// ─── Create Checkout Session (Stripe-hosted page fallback) ──
export async function createCheckoutSession({
  lineItems,
  successUrl,
  cancelUrl,
  customerEmail,
  couponId,
  metadata,
}: {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  couponId?: string
  metadata?: Record<string, string>
}) {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    payment_method_types: ['card'],  // Apple Pay and Google Pay included via card
    discounts: couponId ? [{ coupon: couponId }] : undefined,
    metadata,
    // No shipping — digital only
    shipping_address_collection: undefined,
    phone_number_collection: { enabled: false },
    billing_address_collection: 'auto',
    allow_promotion_codes: true,
  })
}

// ─── Verify Webhook Signature ──────────────────────────────
export function constructWebhookEvent(payload: string | Buffer, sig: string) {
  return stripe.webhooks.constructEvent(
    payload,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

// ─── Format amount from cents ──────────────────────────────
export function formatPrice(amountCents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

// ─── To cents ─────────────────────────────────────────────
export function toCents(amount: number) {
  return Math.round(amount * 100)
}
