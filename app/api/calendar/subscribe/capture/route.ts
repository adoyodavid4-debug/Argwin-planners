// app/api/calendar/subscribe/capture/route.ts
// Captures the PayPal order, verifies it was paid for the right amount, then
// activates the plan for 30 days. Activation only happens after a real capture.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { capturePayPalOrder } from '@/lib/paypal'
import { PLAN_PRICE } from '@/lib/calendar/plan'
import { z } from 'zod'

const schema = z.object({ orderID: z.string().min(1), plan: z.enum(['plus', 'teams']) })

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const { orderID, plan } = parsed.data
  try {
    const cap: any = await capturePayPalOrder(orderID)
    const pu = cap?.purchase_units?.[0]
    const captured = pu?.payments?.captures?.[0]
    const paid = cap?.status === 'COMPLETED' || captured?.status === 'COMPLETED'
    const amount = Number(captured?.amount?.value ?? pu?.amount?.value ?? 0)

    // The order must have been created by subscribe/create-order for THIS user
    // and plan (see the custom_id set there). This stops a store order — or
    // another user's subscribe order — from being redeemed here for a plan grant.
    const boundOk = pu?.custom_id === `sub:${user.id}:${plan}`

    if (!paid || !boundOk || Math.abs(amount - PLAN_PRICE[plan]) > 0.01) {
      console.error('[subscribe/capture] not completed / not bound / amount mismatch', cap?.status, pu?.custom_id, amount)
      return NextResponse.json({ error: 'Payment was not completed correctly.' }, { status: 402 })
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const service = createServiceRoleClient()
    const { error } = await service
      .from('profiles')
      .update({ calendar_plan: plan, plan_expires_at: expiresAt })
      .eq('id', user.id)

    if (error) {
      console.error('[subscribe/capture] activation failed', error)
      return NextResponse.json({ error: 'Payment captured but activation failed — contact support.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, plan, expiresAt })
  } catch (err: any) {
    console.error('[subscribe/capture]', err?.message ?? err)
    return NextResponse.json({ error: 'Payment could not be completed. If you were charged, contact support.' }, { status: 502 })
  }
}
