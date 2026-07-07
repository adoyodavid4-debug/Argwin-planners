// app/api/pesapal/callback/route.ts
// PesaPal's IPN (Instant Payment Notification) — called server-to-server when
// an order's payment status changes. Must reply with the exact JSON shape
// below or PesaPal will keep retrying.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyAndFulfilPesapalOrder } from '@/lib/pesapal'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderTrackingId    = searchParams.get('OrderTrackingId')
  const orderMerchantRef   = searchParams.get('OrderMerchantReference')
  const orderNotifyType    = searchParams.get('OrderNotificationType') ?? 'IPNCHANGE'

  if (!orderTrackingId || !orderMerchantRef) {
    return NextResponse.json({ error: 'Missing OrderTrackingId/OrderMerchantReference' }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()
    // orderMerchantRef is the orders.id we set as the merchant reference at submit time
    await verifyAndFulfilPesapalOrder(supabase, orderMerchantRef)
  } catch (err) {
    console.error('[pesapal/callback]', err)
    // Still acknowledge PesaPal below so it doesn't retry indefinitely on a
    // transient error — the return-page check is the safety net.
  }

  return NextResponse.json({
    orderNotificationType:  orderNotifyType,
    orderTrackingId,
    orderMerchantReference: orderMerchantRef,
    status: 200,
  })
}
