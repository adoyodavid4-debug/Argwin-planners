// lib/pesapal.ts — PesaPal API v3 REST helpers (server-side only)
// Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
import type { SupabaseClient } from '@supabase/supabase-js'
import { fulfilDigitalOrder } from '@/lib/orders'

const PESAPAL_BASE =
  process.env.PESAPAL_ENV === 'sandbox'
    ? 'https://cybqa.pesapal.com/pesapalv3'
    : 'https://pay.pesapal.com/v3'

export async function getPesapalToken(): Promise<string> {
  const consumer_key    = process.env.PESAPAL_CONSUMER_KEY
  const consumer_secret = process.env.PESAPAL_CONSUMER_SECRET
  if (!consumer_key || !consumer_secret) throw new Error('PesaPal credentials are not configured')

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({ consumer_key, consumer_secret }),
    cache:   'no-store',
  })

  const json = await res.json()
  if (!res.ok || !json?.token) {
    throw new Error(`PesaPal auth failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json.token as string
}

// Cached for the life of the warm serverless instance — avoids re-registering
// a fresh IPN with PesaPal on every single order submission.
let cachedIpnId: string | null = null

async function registerIpn(token: string, notifyUrl: string): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body:  JSON.stringify({ url: notifyUrl, ipn_notification_type: 'GET' }),
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok || !json?.ipn_id) {
    throw new Error(`PesaPal IPN registration failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json.ipn_id as string
}

export async function getIpnId(notifyUrl: string): Promise<string> {
  const envIpnId = process.env.PESAPAL_IPN_ID
  if (envIpnId) return envIpnId
  if (cachedIpnId) return cachedIpnId
  const token = await getPesapalToken()
  cachedIpnId = await registerIpn(token, notifyUrl)
  return cachedIpnId
}

export interface SubmitOrderParams {
  merchantReference: string
  amount:            number
  currency?:         string
  description:       string
  callbackUrl:       string
  notificationId:    string
  billingEmail:      string
}

export interface SubmitOrderResult {
  order_tracking_id: string
  merchant_reference: string
  redirect_url:       string
  error?:  { error_type?: string; code?: string; message?: string } | null
  status?: string
}

export async function submitOrderRequest(params: SubmitOrderParams): Promise<SubmitOrderResult> {
  const token = await getPesapalToken()

  const res = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({
      id:               params.merchantReference,
      currency:         params.currency ?? 'USD',
      amount:           params.amount,
      description:      params.description.slice(0, 100),
      callback_url:     params.callbackUrl,
      notification_id:  params.notificationId,
      billing_address: {
        email_address: params.billingEmail,
      },
    }),
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok || !json?.redirect_url || json?.error) {
    throw new Error(`PesaPal submit order failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json as SubmitOrderResult
}

export interface TransactionStatusResult {
  payment_method?:              string
  amount?:                      number
  confirmation_code?:           string
  payment_status_description?:  string // 'COMPLETED' | 'FAILED' | 'INVALID' | 'PENDING' | 'REVERSED'
  status_code?:                 number // 1=COMPLETED, 2=FAILED, 0=INVALID, 3=REVERSED
  merchant_reference?:          string
  error?:  { error_type?: string; code?: string; message?: string } | null
  status?: string
}

export async function getTransactionStatus(orderTrackingId: string): Promise<TransactionStatusResult> {
  const token = await getPesapalToken()

  const res = await fetch(
    `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache:   'no-store',
    }
  )

  const json = await res.json()
  if (!res.ok) {
    throw new Error(`PesaPal status check failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json as TransactionStatusResult
}

// Shared verify+update+fulfil logic — called by both the IPN callback and the
// user-facing return page, so an order only ever gets marked completed once
// the actual PesaPal status has been checked (never trust the redirect alone).
export async function verifyAndFulfilPesapalOrder(supabase: SupabaseClient, orderId: string) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, metadata')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    console.error('[pesapal] verify: order not found', orderId, error)
    return null
  }

  // Already resolved (IPN beat us here, or this is a repeat check) — no-op
  if (order.status === 'completed') {
    await fulfilDigitalOrder(supabase, order.id)
    return { status: 'completed' as const }
  }
  if (order.status === 'cancelled') {
    return { status: 'cancelled' as const }
  }

  const metadata = (order.metadata as Record<string, unknown> | null) ?? {}
  const orderTrackingId = metadata.pesapal_order_tracking_id as string | undefined
  if (!orderTrackingId) {
    console.error('[pesapal] verify: no order_tracking_id on order', orderId)
    return null
  }

  const result = await getTransactionStatus(orderTrackingId)
  const statusCode = result.status_code

  if (statusCode === 1) {
    await supabase
      .from('orders')
      .update({
        status:         'completed',
        payment_method: 'pesapal',
        metadata: {
          ...metadata,
          pesapal_confirmation_code: result.confirmation_code,
          pesapal_payment_method:    result.payment_method,
        },
      })
      .eq('id', order.id)

    await fulfilDigitalOrder(supabase, order.id)
    return { status: 'completed' as const }
  }

  if (statusCode === 2 || statusCode === 0) {
    await supabase
      .from('orders')
      .update({
        status:   'cancelled',
        metadata: { ...metadata, pesapal_status_description: result.payment_status_description },
      })
      .eq('id', order.id)
    return { status: 'cancelled' as const }
  }

  if (statusCode === 3) {
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id)
    return { status: 'refunded' as const }
  }

  // Still pending (status_code undefined or unrecognised) — leave as-is
  return { status: 'pending' as const }
}
