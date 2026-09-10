// app/api/calendar/subscribe/record/route.ts
// Called on PayPal onApprove. Verifies the subscription with PayPal (status,
// plan, owner) before activating the plan. The webhook is the ongoing source
// of truth; this gives instant activation.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSubscription, planIdFor } from '@/lib/paypal'
import { z } from 'zod'

const schema = z.object({ subscriptionID: z.string().min(1), plan: z.enum(['plus', 'teams']) })

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const { subscriptionID, plan } = parsed.data
  try {
    const sub: any = await getSubscription(subscriptionID)
    const okStatus = sub.status === 'ACTIVE' || sub.status === 'APPROVED'
    const planMatches = sub.plan_id === planIdFor(plan)
    // Strict: the subscription must carry this user's id as custom_id (set at
    // creation, client-side). Previously a missing custom_id passed, which let
    // one payment be recorded against many accounts by replaying the id.
    const ownerOk = sub.custom_id === user.id
    if (!okStatus || !planMatches || !ownerOk) {
      console.error('[subscribe/record] invalid', sub.status, sub.plan_id, sub.custom_id)
      return NextResponse.json({ error: 'Subscription could not be verified.' }, { status: 402 })
    }

    const service = createServiceRoleClient()

    // A subscription id may only ever back one account. Reject if another
    // profile already holds it (defence-in-depth against id replay/cloning).
    const { data: existing } = await service
      .from('profiles')
      .select('id')
      .eq('paypal_subscription_id', subscriptionID)
      .neq('id', user.id)
      .maybeSingle()
    if (existing) {
      console.error('[subscribe/record] subscription already bound to another account', subscriptionID)
      return NextResponse.json({ error: 'This subscription is already linked to another account.' }, { status: 409 })
    }

    const nbt = sub.billing_info?.next_billing_time
    const expiresAt = nbt ? new Date(nbt).toISOString() : new Date(Date.now() + 31 * 864e5).toISOString()
    const { error } = await service
      .from('profiles')
      .update({ calendar_plan: plan, paypal_subscription_id: subscriptionID, plan_expires_at: expiresAt })
      .eq('id', user.id)
    if (error) {
      console.error('[subscribe/record] activation failed', error)
      return NextResponse.json({ error: 'Subscription active but activation failed — contact support.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, plan, expiresAt })
  } catch (err: any) {
    console.error('[subscribe/record]', err?.message ?? err)
    return NextResponse.json({ error: 'Could not verify your subscription. Please try again.' }, { status: 502 })
  }
}
