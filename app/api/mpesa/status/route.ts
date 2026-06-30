import { NextRequest, NextResponse } from 'next/server'
import { queryStkStatus } from '@/lib/mpesa'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET /api/mpesa/status?checkoutRequestId=xxx&orderId=xxx
export async function GET(req: NextRequest) {
  const { searchParams }    = new URL(req.url)
  const checkoutRequestId   = searchParams.get('checkoutRequestId')
  const orderId             = searchParams.get('orderId')

  if (!checkoutRequestId || !orderId) {
    return NextResponse.json({ error: 'checkoutRequestId and orderId are required' }, { status: 400 })
  }

  try {
    // 1. Check our DB first — callback may have already updated it
    const supabase = createServiceRoleClient()
    const { data: order } = await supabase
      .from('orders')
      .select('status, metadata')
      .eq('id', orderId)
      .single()

    if (order?.status === 'completed') {
      return NextResponse.json({
        status:        'completed',
        receipt:       order.metadata?.mpesa_receipt,
        amountKes:     order.metadata?.kes_amount,
      })
    }

    if (order?.status === 'cancelled') {
      return NextResponse.json({
        status:     'cancelled',
        resultDesc: order.metadata?.result_desc ?? 'Payment cancelled',
      })
    }

    // 2. DB still shows pending — ask Safaricom directly (works in sandbox too)
    const result = await queryStkStatus(checkoutRequestId)

    // Daraja returns ResultCode as a string ("0", "1032", etc.)
    const code = String(result.ResultCode ?? result.ResponseCode ?? '')

    if (code === '0') {
      // Mark completed in our DB
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId)
        .eq('status', 'pending')

      return NextResponse.json({ status: 'completed', receipt: result.MpesaReceiptNumber ?? '' })
    }

    if (code === '1032') {
      await supabase
        .from('orders')
        .update({
          status:   'cancelled',
          metadata: { ...(order?.metadata ?? {}), result_desc: result.ResultDesc },
        })
        .eq('id', orderId)

      return NextResponse.json({ status: 'cancelled', resultDesc: 'You cancelled the payment' })
    }

    if (code === '1') {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
      return NextResponse.json({ status: 'cancelled', resultDesc: result.ResultDesc ?? 'Insufficient M-Pesa balance' })
    }

    // Still pending or processing
    return NextResponse.json({ status: 'pending' })
  } catch (err: unknown) {
    // If Safaricom query fails (no network / sandbox quirk), stay pending
    console.warn('[mpesa/status]', err)
    return NextResponse.json({ status: 'pending' })
  }
}
