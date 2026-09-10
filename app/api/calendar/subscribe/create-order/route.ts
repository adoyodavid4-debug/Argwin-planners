// app/api/calendar/subscribe/create-order/route.ts
// Starts a PayPal order for one month of a calendar plan (server sets the price).
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createPayPalOrder } from '@/lib/paypal'
import { PLAN_PRICE } from '@/lib/calendar/plan'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const schema = z.object({ plan: z.enum(['plus', 'teams']) })

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const plan = parsed.data.plan
  const total = PLAN_PRICE[plan]
  try {
    const order = await createPayPalOrder({
      referenceId: randomUUID(),
      // Bind the order to this user + plan so only subscribe/capture (for the
      // same user/plan) can redeem it — a store order can't be used here and
      // vice-versa.
      customId: `sub:${user.id}:${plan}`,
      total,
      items: [{ title: `Arwign ${plan === 'plus' ? 'Plus' : 'Teams'} — 1 month`, price: total, quantity: 1 }],
    })
    return NextResponse.json({ id: order.id })
  } catch (err) {
    console.error('[subscribe/create-order]', err)
    return NextResponse.json({ error: 'Could not start PayPal checkout. Please try again.' }, { status: 502 })
  }
}
