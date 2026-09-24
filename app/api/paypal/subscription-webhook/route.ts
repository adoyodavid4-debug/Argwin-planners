// app/api/paypal/subscription-webhook/route.ts
// PayPal calls this on subscription AND store-payment events. We verify the
// signature (needs PAYPAL_WEBHOOK_ID), then keep calendar_plan / plan_expires_at
// and order status in sync.
// Register this URL in the PayPal dashboard for:
//   BILLING.SUBSCRIPTION.ACTIVATED / CANCELLED / EXPIRED / SUSPENDED,
//   PAYMENT.SALE.COMPLETED / PAYMENT.SALE.REFUNDED,
//   PAYMENT.CAPTURE.REFUNDED / PAYMENT.CAPTURE.REVERSED
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, getSubscription } from '@/lib/paypal'
import { PLAN_PRICE } from '@/lib/calendar/plan'

const monthFromNow = () => new Date(Date.now() + 31 * 864e5).toISOString()
const planFromId = (id?: string) => (id && id === process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID ? 'teams' : 'plus')

// Durable record of a subscription money event in orders — previously these
// charges left no row (and no buyer email) in our database at all. Keyed on the
// PayPal event id so webhook redeliveries don't duplicate. Best-effort: a
// bookkeeping failure is logged, never breaks plan-state handling.
async function recordSubscriptionPayment(
  service: ReturnType<typeof createServiceRoleClient>,
  args: { eventId: string; userId: string; email: string; plan: 'plus' | 'teams'; amount: number; subscriptionId: string; kind: string }
) {
  try {
    const { data: dup } = await service
      .from('orders').select('id')
      .filter('metadata->>paypal_event_id', 'eq', args.eventId)
      .limit(1)
    if (dup?.length) return
    const { error } = await service.from('orders').insert({
      user_id:         args.userId,
      email:           args.email,
      status:          'completed',
      payment_method:  'paypal',
      amount_subtotal: args.amount,
      amount_discount: 0,
      amount_total:    args.amount,
      currency:        'USD',
      metadata:        { type: 'calendar_subscription', kind: args.kind, plan: args.plan, paypal_subscription_id: args.subscriptionId, paypal_event_id: args.eventId },
    })
    if (error) console.error('[paypal-webhook] payment record insert failed', args.kind, error)
  } catch (err) {
    console.error('[paypal-webhook] payment record failed', args.kind, err)
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  let event: any
  try { event = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const headers = {
    'paypal-auth-algo': req.headers.get('paypal-auth-algo'),
    'paypal-cert-url': req.headers.get('paypal-cert-url'),
    'paypal-transmission-id': req.headers.get('paypal-transmission-id'),
    'paypal-transmission-sig': req.headers.get('paypal-transmission-sig'),
    'paypal-transmission-time': req.headers.get('paypal-transmission-time'),
  }
  if (!(await verifyWebhookSignature(headers, event))) {
    console.error('[paypal-webhook] invalid signature', event?.event_type)
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const type: string = event.event_type
  const r = event.resource ?? {}
  try {
    if (type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const expires = r.billing_info?.next_billing_time ? new Date(r.billing_info.next_billing_time).toISOString() : monthFromNow()
      if (r.custom_id) {
        await service.from('profiles').update({
          calendar_plan: planFromId(r.plan_id), paypal_subscription_id: r.id, plan_expires_at: expires,
        }).eq('id', r.custom_id)
        const plan = planFromId(r.plan_id)
        const { data: prof } = await service.from('profiles').select('email').eq('id', r.custom_id).maybeSingle()
        const paid = Number(r.billing_info?.last_payment?.amount?.value ?? PLAN_PRICE[plan])
        await recordSubscriptionPayment(service, {
          eventId: event.id ?? `${type}:${r.id}`, userId: r.custom_id, email: prof?.email ?? '',
          plan, amount: paid, subscriptionId: r.id, kind: 'activation',
        })
      } else {
        // A paid subscription we cannot link to a user — surface it loudly
        // instead of dropping it silently.
        console.error('[paypal-webhook] BILLING.SUBSCRIPTION.ACTIVATED without custom_id — unlinked paid subscription', r.id)
      }
    } else if (type === 'PAYMENT.SALE.COMPLETED') {
      const subId = r.billing_agreement_id
      if (subId) {
        let expires = monthFromNow()
        try { const sub: any = await getSubscription(subId); if (sub.billing_info?.next_billing_time) expires = new Date(sub.billing_info.next_billing_time).toISOString() } catch {}
        await service.from('profiles').update({ plan_expires_at: expires }).eq('paypal_subscription_id', subId)
        const { data: prof } = await service.from('profiles')
          .select('id, email, calendar_plan').eq('paypal_subscription_id', subId).maybeSingle()
        if (prof) {
          const plan = prof.calendar_plan === 'teams' ? 'teams' as const : 'plus' as const
          await recordSubscriptionPayment(service, {
            eventId: event.id ?? `${type}:${r.id}`, userId: prof.id, email: prof.email ?? '',
            plan, amount: Number(r.amount?.total ?? PLAN_PRICE[plan]), subscriptionId: subId, kind: 'renewal',
          })
        }
      }
    } else if (type === 'BILLING.SUBSCRIPTION.EXPIRED') {
      if (r.id) await service.from('profiles').update({ calendar_plan: 'free', paypal_subscription_id: null }).eq('paypal_subscription_id', r.id)
    } else if (type === 'BILLING.SUBSCRIPTION.CANCELLED' || type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      // Stop renewal; keep access until plan_expires_at (getPlanInfo lapses it there).
      if (r.id) await service.from('profiles').update({ paypal_subscription_id: null }).eq('paypal_subscription_id', r.id)
    } else if (type === 'PAYMENT.CAPTURE.REFUNDED' || type === 'PAYMENT.CAPTURE.REVERSED') {
      // Store-order refund / chargeback. custom_id carries our orders.id (set as
      // referenceId in create-order). Revoke the download entitlement on a FULL
      // refund — the download route blocks status='refunded'. Partial refunds
      // keep access (logged for manual review).
      const orderId: string | undefined = r.custom_id
      if (orderId) {
        const { data: ord } = await service.from('orders').select('amount_total, status').eq('id', orderId).maybeSingle()
        const refunded = Number(r.amount?.value ?? r.seller_payable_breakdown?.total_refunded_amount?.value ?? 0)
        if (ord && refunded >= Number(ord.amount_total) - 0.01) {
          await service.from('orders').update({ status: 'refunded' }).eq('id', orderId)
        } else {
          console.warn('[paypal-webhook] partial/unknown refund, entitlement kept', orderId, refunded)
        }
      }
    } else if (type === 'PAYMENT.SALE.REFUNDED') {
      // Subscription payment refunded — drop the plan to free immediately and
      // detach the subscription id so a later renewal can't re-extend it.
      const subId = r.billing_agreement_id
      if (subId) {
        await service.from('profiles')
          .update({ calendar_plan: 'free', plan_expires_at: new Date().toISOString(), paypal_subscription_id: null })
          .eq('paypal_subscription_id', subId)
      }
    }
  } catch (err) {
    console.error('[paypal-webhook]', type, err)
  }
  return NextResponse.json({ received: true })
}
