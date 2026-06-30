import { NextRequest, NextResponse } from 'next/server'
import { initiateStkPush, formatPhone } from '@/lib/mpesa'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface CartItem {
  id:        string
  title:     string
  price:     number
  quantity?: number
  slug:      string
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const { phone, items, email }: { phone: string; items: CartItem[]; email: string } = body

    if (!phone || !items?.length || !email) {
      return NextResponse.json({ error: 'phone, email and items are required' }, { status: 400 })
    }

    // Validate phone loosely — must be ≥9 digits after formatting
    const formattedPhone = formatPhone(phone)
    if (!/^2547\d{8}$|^2541\d{8}$/.test(formattedPhone)) {
      return NextResponse.json({ error: 'Enter a valid Kenyan phone number (e.g. 0712 345 678)' }, { status: 400 })
    }

    // Convert USD total to KES
    const totalUsd = items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0)
    const kesRate  = Math.max(1, parseInt(process.env.MPESA_KES_RATE ?? '130', 10))
    const amountKes = Math.round(totalUsd * kesRate)

    if (amountKes < 1) {
      return NextResponse.json({ error: 'Cart total is too low' }, { status: 400 })
    }

    // Create pending order so the callback can update it
    const supabase  = createServiceRoleClient()
    const orderRef  = `ARW-${Date.now()}`

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        email,
        status:          'pending',
        payment_method:  'mpesa',
        amount_subtotal: totalUsd,
        amount_total:    totalUsd,
        currency:        'USD',
        metadata: {
          order_ref:  orderRef,
          kes_amount: amountKes,
          mpesa_phone: formattedPhone,
        },
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      console.error('[mpesa/stkpush] order insert:', orderErr)
      return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
    }

    // Insert order line items
    await supabase.from('order_items').insert(
      items.map((item) => ({
        order_id:   order.id,
        product_id: item.id,
        title:      item.title,
        price:      item.price,
        quantity:   item.quantity ?? 1,
      }))
    )

    // Derive callback URL (ngrok in dev, real domain in production)
    const appUrl      = process.env.MPESA_CALLBACK_URL
      ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/mpesa/callback`

    const pushResult  = await initiateStkPush({
      phone:            formattedPhone,
      amountKes,
      accountReference: orderRef,
      description:      `Arwign x${items.length}`,
      callbackUrl:      appUrl,
    })

    if (pushResult.ResponseCode !== '0') {
      // Roll back order on STK failure
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: pushResult.ResponseDescription ?? 'STK Push failed', raw: pushResult },
        { status: 502 }
      )
    }

    // Persist CheckoutRequestID so the callback can look this order up
    await supabase
      .from('orders')
      .update({
        metadata: {
          order_ref:                    orderRef,
          kes_amount:                   amountKes,
          mpesa_phone:                  formattedPhone,
          mpesa_checkout_request_id:    pushResult.CheckoutRequestID,
          mpesa_merchant_request_id:    pushResult.MerchantRequestID,
        },
      })
      .eq('id', order.id)

    return NextResponse.json({
      success:           true,
      checkoutRequestId: pushResult.CheckoutRequestID,
      merchantRequestId: pushResult.MerchantRequestID,
      orderId:           order.id,
      amountKes,
      customerMessage:   pushResult.CustomerMessage ?? 'Check your phone for the M-Pesa PIN prompt.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[mpesa/stkpush]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
