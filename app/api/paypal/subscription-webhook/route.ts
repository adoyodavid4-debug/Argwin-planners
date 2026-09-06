// app/api/paypal/subscription-webhook/route.ts
// PayPal calls this on subscription lifecycle events. We verify the signature
// (needs PAYPAL_WEBHOOK_ID), then keep calendar_plan / plan_expires_at in sync.
// Register this URL in the PayPal dashboard for:
//   BILLING.SUBSCRIPTION.ACTIVATED / CANCELLED / EXPIRED / SUSPENDED,
//   PAYMENT.SALE.COMPLETED
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, getSubscription } from '@/lib/paypal'

const monthFromNow = () => new Date(Date.now() + 31 * 864e5).toISOString()
const planFromId = (id?: string) => (id && id === process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID ? 'teams' : 'plus')

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
      }
    } else if (type === 'PAYMENT.SALE.COMPLETED') {
      const subId = r.billing_agreement_id
      if (subId) {
        let expires = monthFromNow()
        try { const sub: any = await getSubscription(subId); if (sub.billing_info?.next_billing_time) expires = new Date(sub.billing_info.next_billing_time).toISOString() } catch {}
        await service.from('profiles').update({ plan_expires_at: expires }).eq('paypal_subscription_id', subId)
      }
    } else if (type === 'BILLING.SUBSCRIPTION.EXPIRED') {
      if (r.id) await service.from('profiles').update({ calendar_plan: 'free', paypal_subscription_id: null }).eq('paypal_subscription_id', r.id)
    } else if (type === 'BILLING.SUBSCRIPTION.CANCELLED' || type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      // Stop renewal; keep access until plan_expires_at (getPlanInfo lapses it there).
      if (r.id) await service.from('profiles').update({ paypal_subscription_id: null }).eq('paypal_subscription_id', r.id)
    }
  } catch (err) {
    console.error('[paypal-webhook]', type, err)
  }
  return NextResponse.json({ received: true })
}
