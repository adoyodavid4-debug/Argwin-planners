import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Safaricom posts to this URL after the user completes (or cancels) the PIN prompt.
// Must reply 200 quickly — do heavy work asynchronously.
export async function POST(req: NextRequest) {
  try {
    const body     = await req.json()
    const callback = body?.Body?.stkCallback

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const {
      ResultCode,
      ResultDesc,
      CheckoutRequestID,
      CallbackMetadata,
    } = callback

    const supabase = createServiceRoleClient()

    // Find the matching pending order via JSONB field
    const { data: orders } = await supabase
      .from('orders')
      .select('id, metadata')
      .filter('metadata->>mpesa_checkout_request_id', 'eq', CheckoutRequestID)
      .eq('status', 'pending')
      .limit(1)

    const order = orders?.[0]
    if (!order) {
      // Unknown order — still acknowledge Safaricom
      console.warn('[mpesa/callback] unknown CheckoutRequestID:', CheckoutRequestID)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if (ResultCode === 0 || ResultCode === '0') {
      // ── Payment successful ──────────────────────────────────
      const items: { Name: string; Value: unknown }[] = CallbackMetadata?.Item ?? []
      const get = (name: string) => items.find((i) => i.Name === name)?.Value

      const mpesaReceipt = get('MpesaReceiptNumber') as string | undefined
      const mpesaAmount  = get('Amount')             as number | undefined
      const mpesaPhone   = get('PhoneNumber')        as number | undefined

      await supabase
        .from('orders')
        .update({
          status:         'completed',
          payment_method: 'mpesa',
          metadata: {
            ...order.metadata,
            mpesa_receipt:  mpesaReceipt,
            mpesa_amount:   mpesaAmount,
            mpesa_phone_cb: mpesaPhone?.toString(),
            result_desc:    ResultDesc,
          },
        })
        .eq('id', order.id)
    } else {
      // ── Cancelled or failed ─────────────────────────────────
      await supabase
        .from('orders')
        .update({
          status:   'cancelled',
          metadata: {
            ...order.metadata,
            result_code: ResultCode,
            result_desc: ResultDesc,
          },
        })
        .eq('id', order.id)
    }

    // Safaricom expects this exact response shape
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (err) {
    console.error('[mpesa/callback]', err)
    // Always reply 200 so Safaricom doesn't retry
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
