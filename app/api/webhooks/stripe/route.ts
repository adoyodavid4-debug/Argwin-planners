// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { addDays } from 'date-fns'

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

      const productIds = session.metadata?.product_ids?.split(',').filter(Boolean) ?? []
      const email      = session.customer_email ?? session.customer_details?.email ?? ''

      // Fetch products for order items
      const { data: products } = await supabase
        .from('products')
        .select('id, title, price')
        .in('id', productIds)

      if (!products?.length) break

      const total = products.reduce((sum, p) => sum + p.price, 0)

      // Generate signed download tokens (simple UUID token — in prod use signed JWTs)
      const downloadTokens: Record<string, string> = {}
      productIds.forEach((id) => {
        downloadTokens[id] = crypto.randomUUID()
      })

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          email,
          status:                   'completed',
          stripe_payment_intent:    session.payment_intent as string,
          payment_method:           'stripe_card',
          amount_subtotal:          total,
          amount_discount:          0,
          amount_total:             total,
          currency:                 'usd',
          coupon_code:              session.metadata?.coupon_code || null,
          download_tokens:          downloadTokens,
          downloads_expire:         addDays(new Date(), 365).toISOString(),
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

      // Increment download counts
      await Promise.all(productIds.map((id) =>
        supabase.from('products')
          .update({ download_count: supabase.rpc('increment_download', { product_id: id }) as any })
          .eq('id', id)
      ))

      // TODO: Send confirmation email via Resend / Nodemailer
      // await sendOrderConfirmation({ email, orderId: order.id, products, downloadTokens })

      console.log(`[stripe-webhook] Order ${order.id} completed for ${email}`)
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
