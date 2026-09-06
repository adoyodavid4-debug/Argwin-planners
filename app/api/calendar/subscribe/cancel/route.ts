// app/api/calendar/subscribe/cancel/route.ts
// Cancels the user's PayPal subscription (stops future billing). Access stays
// until the current period ends (plan_expires_at), after which getPlanInfo
// lapses them to Free.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/paypal'

export async function POST() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const service = createServiceRoleClient()
  const { data: prof } = await service
    .from('profiles')
    .select('paypal_subscription_id, plan_expires_at')
    .eq('id', user.id)
    .maybeSingle()

  const subId = prof?.paypal_subscription_id
  if (!subId) return NextResponse.json({ error: 'No active subscription to cancel.' }, { status: 400 })

  try {
    await cancelSubscription(subId, 'Cancelled from Manage plan')
  } catch (err: any) {
    console.error('[subscribe/cancel]', err?.message ?? err)
    return NextResponse.json({ error: 'Could not cancel with PayPal. Please try again.' }, { status: 502 })
  }

  // Stop renewal now; keep paid access until the period ends.
  await service.from('profiles').update({ paypal_subscription_id: null }).eq('id', user.id)
  return NextResponse.json({ ok: true, until: prof?.plan_expires_at ?? null })
}
