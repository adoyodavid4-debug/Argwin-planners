// app/api/paystack/webhook/route.ts
// Paystack calls this server-to-server when a transaction's status changes.
// We verify the signature, then verify+fulfil on charge.success. This is the
// reliable source of truth (the browser return page is just a fast-path).
// Mirrors app/api/pesapal/callback/route.ts.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyPaystackSignature, verifyAndFulfilPaystackOrder } from '@/lib/paystack'

export async function POST(req: NextRequest) {
  // Must read the RAW body to validate the signature
  const rawBody   = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  if (!verifyPaystackSignature(rawBody, signature)) {
    console.error('[paystack/webhook] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // reference is our orders.id (set at initialize time)
  const reference: string | undefined = event?.data?.reference

  if (event?.event === 'charge.success' && reference) {
    try {
      const supabase = createServiceRoleClient()
      await verifyAndFulfilPaystackOrder(supabase, reference)
    } catch (err) {
      console.error('[paystack/webhook]', err)
      // Still 200 below so Paystack doesn't hammer retries on a transient error;
      // the return page + a later verify are the safety net.
    }
  }

  // Always acknowledge receipt
  return NextResponse.json({ received: true })
}
