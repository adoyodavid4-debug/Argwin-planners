// lib/orders.ts — shared digital-order fulfilment: download tokens + confirmation email.
// Used by the Stripe webhook and PayPal capture route.
// All operations are idempotent so retried webhooks / polling never double-fulfil.
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, format } from 'date-fns'
import { getEmailProvider } from '@/lib/email'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL
  ?? process.env.NEXT_PUBLIC_SITE_URL
  ?? 'https://arwignplanners.com'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe_card: 'Card',
  paypal:      'PayPal',
  apple_pay:   'Apple Pay',
  google_pay:  'Google Pay',
}

// Tokens are `<orderId>.<random uuid>` so the download route can resolve the
// order with a single primary-key lookup instead of scanning JSONB values.
function generateDownloadToken(orderId: string) {
  return `${orderId}.${crypto.randomUUID()}`
}

// Increment products.download_count with a real read-then-update (best effort).
export async function incrementDownloadCount(supabase: SupabaseClient, productId: string) {
  const { data: product } = await supabase
    .from('products')
    .select('download_count')
    .eq('id', productId)
    .single()

  if (!product) return
  await supabase
    .from('products')
    .update({ download_count: (product.download_count ?? 0) + 1 })
    .eq('id', productId)
}

/**
 * Ensure a completed digital order has download tokens and a confirmation email.
 * - Generates download_tokens (+365d expiry) only if not already present.
 * - Sends the 'order.confirmation' email once (flagged in order.metadata).
 * - Email failures are swallowed (logged) so a Resend outage never fails the
 *   payment handler that called us.
 */
export async function fulfilDigitalOrder(supabase: SupabaseClient, orderId: string) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, email, status, payment_method, amount_total, currency, invoice_number, download_tokens, downloads_expire, metadata, created_at')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    console.error('[orders] fulfil: order not found', orderId, error)
    return null
  }
  if (order.status !== 'completed') return null

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, title, price, quantity')
    .eq('order_id', orderId)

  if (!items?.length) {
    console.warn('[orders] fulfil: order has no items', orderId)
    return null
  }

  // ── 1. Download tokens (idempotent — never regenerate) ──────────
  let tokens: Record<string, string> =
    (order.download_tokens as Record<string, string> | null) ?? {}
  let expires: string = order.downloads_expire ?? addDays(new Date(), 365).toISOString()

  if (!Object.keys(tokens).length) {
    tokens  = {}
    expires = addDays(new Date(), 365).toISOString()
    items.forEach((i) => { tokens[i.product_id] = generateDownloadToken(orderId) })

    const { error: tokenErr } = await supabase
      .from('orders')
      .update({ download_tokens: tokens, downloads_expire: expires })
      .eq('id', orderId)

    if (tokenErr) {
      console.error('[orders] fulfil: token update failed', orderId, tokenErr)
      return null
    }
  }

  // ── 2. Confirmation email (once per order) ──────────────────────
  const metadata = (order.metadata as Record<string, unknown> | null) ?? {}
  if (!metadata.order_confirmation_sent && order.email) {
    try {
      await getEmailProvider().sendTransactional({
        to:             order.email,
        locale:         'en',
        templateKey:    'order.confirmation',
        idempotencyKey: `order-confirmation-${orderId}`,
        data: {
          invoice_number: order.invoice_number ?? orderId.slice(0, 8).toUpperCase(),
          order_date:     format(new Date(order.created_at), 'd MMMM yyyy'),
          items:          items.map((i) => ({ title: i.title, price: i.price, quantity: i.quantity })),
          total:          order.amount_total,
          currency:       order.currency ?? 'USD',
          payment_method: PAYMENT_METHOD_LABELS[order.payment_method ?? ''] ?? order.payment_method ?? 'Card',
          downloads:      items
            .filter((i) => tokens[i.product_id])
            .map((i) => ({ title: i.title, url: `${APP_URL}/api/download/${tokens[i.product_id]}` })),
          support_email:  'support@arwignplanners.com',
        },
        category: 'sales',
      })

      await supabase
        .from('orders')
        .update({ metadata: { ...metadata, order_confirmation_sent: true } })
        .eq('id', orderId)
    } catch (err) {
      // Never let an email failure break the payment handler
      console.error('[orders] fulfil: confirmation email failed', orderId, err)
    }
  }

  return { tokens, expires }
}
