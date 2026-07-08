// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fulfilDigitalOrder, incrementDownloadCount } from '@/lib/orders'
import { getEmailProvider } from '@/lib/email'
import Stripe from 'stripe'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, sig)
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.payment_status !== 'paid') break

      // Idempotency — Stripe retries webhooks; never create the order twice
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .filter('metadata->>stripe_session_id', 'eq', session.id)
        .limit(1)

      if (existing?.length) {
        await fulfilDigitalOrder(supabase, existing[0].id)
        break
      }

      const productIds = session.metadata?.product_ids?.split(',').filter(Boolean) ?? []
      const email      = session.customer_email ?? session.customer_details?.email ?? ''

      // Fetch products for order items
      const { data: products } = await supabase
        .from('products')
        .select('id, title, price')
        .in('id', productIds)

      if (!products?.length) break

      const subtotal = products.reduce((sum, p) => sum + p.price, 0)
      const total    = session.amount_total != null ? session.amount_total / 100 : subtotal
      const discount = session.total_details?.amount_discount != null
        ? session.total_details.amount_discount / 100
        : Math.max(0, subtotal - total)

      // Create order — the stripe session id lives in metadata so the success
      // page can resolve the order from ?session_id=
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          email,
          status:                'completed',
          stripe_payment_intent: session.payment_intent as string,
          payment_method:        'stripe_card',
          amount_subtotal:       subtotal,
          amount_discount:       discount,
          amount_total:          total,
          currency:              'usd',
          coupon_code:           session.metadata?.coupon_code || null,
          metadata:              { stripe_session_id: session.id },
        })
        .select('id')
        .single()

      if (orderErr || !order) {
        console.error('[stripe-webhook] Order creation failed:', orderErr)
        break
      }

      // Insert order items
      await supabase.from('order_items').insert(
        products.map((p) => ({
          order_id:   order.id,
          product_id: p.id,
          title:      p.title,
          price:      p.price,
          quantity:   1,
        }))
      )

      // Increment download counts (real read-then-update)
      await Promise.all(productIds.map((id) => incrementDownloadCount(supabase, id)))

      // Generate download tokens + send the confirmation email (idempotent)
      await fulfilDigitalOrder(supabase, order.id)

      console.log(`[stripe-webhook] Order ${order.id} completed for ${email}`)
      break
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent

      // Only physical (print-on-demand) checkouts — created by /api/checkout/physical.
      // Digital checkout sessions are handled by checkout.session.completed above.
      if (pi.metadata?.type !== 'physical') break

      // Idempotency — skip if we already recorded this payment
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('stripe_payment_intent', pi.id)
        .limit(1)

      if (existing?.length) break

      const printProductId = pi.metadata.print_product_id
      const quantity       = parseInt(pi.metadata.quantity ?? '1', 10) || 1
      const shippingLevel  = pi.metadata.shipping_level ?? 'MAIL'
      const shippingCost   = parseInt(pi.metadata.shipping_cost ?? '0', 10) || 0

      let shippingAddress: Record<string, string> = {}
      try {
        shippingAddress = JSON.parse(pi.metadata.shipping_address ?? '{}')
      } catch {
        console.error('[stripe-webhook] Invalid shipping_address metadata on', pi.id)
      }

      const email = shippingAddress.email ?? pi.receipt_email ?? ''

      // Resolve the underlying product for the order line item
      const { data: pp } = await supabase
        .from('print_products')
        .select('id, product_id, retail_price, currency, products(title)')
        .eq('id', printProductId)
        .single()

      const productTitle = (pp?.products as unknown as { title: string } | null)?.title ?? 'Printed notebook'
      const currency     = (pi.currency ?? pp?.currency ?? 'usd').toLowerCase()
      const totalMinor   = pi.amount
      const subtotalMinor = totalMinor - shippingCost

      // Parent order row (amounts in major units)
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          email,
          status:                'completed',
          stripe_payment_intent: pi.id,
          payment_method:        'stripe_card',
          amount_subtotal:       subtotalMinor / 100,
          amount_discount:       0,
          amount_total:          totalMinor / 100,
          currency,
          metadata:              { type: 'physical', print_product_id: printProductId },
        })
        .select('id, invoice_number, created_at')
        .single()

      if (orderErr || !order) {
        console.error('[stripe-webhook] Physical order creation failed:', orderErr)
        break
      }

      if (pp?.product_id) {
        await supabase.from('order_items').insert({
          order_id:   order.id,
          product_id: pp.product_id,
          title:      productTitle,
          price:      pp.retail_price / 100,
          quantity,
        })
      }

      // The physical_orders row the physical checkout route promises
      const { error: poErr } = await supabase.from('physical_orders').insert({
        order_id:           order.id,
        shipping_address:   shippingAddress,
        shipping_level:     shippingLevel,
        shipping_cost:      shippingCost,
        subtotal:           subtotalMinor,
        total:              totalMinor,
        currency:           currency.toUpperCase(),
        provider:           'lulu',
        fulfillment_status: 'pending_review',
      })

      if (poErr) console.error('[stripe-webhook] physical_orders insert failed:', poErr)

      // Receipt email (no download links — physical goods). Never fail the webhook on it.
      if (email) {
        try {
          await getEmailProvider().sendTransactional({
            to:             email,
            locale:         'en',
            templateKey:    'order.confirmation',
            idempotencyKey: `order-confirmation-${order.id}`,
            data: {
              invoice_number: order.invoice_number ?? order.id.slice(0, 8).toUpperCase(),
              order_date:     format(new Date(order.created_at), 'd MMMM yyyy'),
              items:          [{ title: productTitle, price: pp ? pp.retail_price / 100 : totalMinor / 100, quantity }],
              total:          totalMinor / 100,
              currency:       currency.toUpperCase(),
              payment_method: 'Card',
              downloads:      [],
              support_email:  'support@arwignplanners.com',
            },
            category: 'info',
          })
        } catch (err) {
          console.error('[stripe-webhook] physical receipt email failed:', err)
        }
      }

      console.log(`[stripe-webhook] Physical order ${order.id} created for ${email}`)
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      console.warn('[stripe-webhook] Payment failed:', pi.id)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
