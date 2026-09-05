// lib/paystack.ts — Paystack REST helpers (server-side only)
// Docs: https://paystack.com/docs/api/
// Amounts are charged in USD; Paystack expects the amount in the smallest unit
// (cents), so every amount is multiplied by 100. NOTE: charging in USD requires
// USD to be enabled on your Paystack account (ask Paystack support to enable it).
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fulfilDigitalOrder } from '@/lib/orders'

const PAYSTACK_BASE = 'https://api.paystack.co'
const CURRENCY = 'USD'

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('Paystack secret key is not configured')
  return key
}

// Convert a USD amount (e.g. 12.99) to the integer subunit Paystack expects (1299).
function toSubunit(amountUsd: number): number {
  return Math.round(amountUsd * 100)
}

export interface InitializeParams {
  email:       string
  amount:      number   // USD, e.g. 12.99
  reference:   string   // our orders.id — lets the webhook/return reconcile by primary key
  callbackUrl: string
}

export interface InitializeResult {
  authorization_url: string
  access_code:       string
  reference:         string
}

// Start a transaction; returns the hosted Paystack URL to redirect the buyer to.
export async function initializePaystackTransaction(params: InitializeParams): Promise<InitializeResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email:        params.email,
      amount:       toSubunit(params.amount),
      currency:     CURRENCY,
      reference:    params.reference,
      callback_url: params.callbackUrl,
    }),
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok || !json?.status || !json?.data?.authorization_url) {
    throw new Error(`Paystack initialize failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json.data as InitializeResult
}

export interface VerifyResult {
  status:   string   // 'success' | 'failed' | 'abandoned' | ...
  amount:   number   // in subunit (cents)
  currency: string
  reference: string
  [key: string]: unknown
}

// Confirm a transaction directly with Paystack (never trust the browser redirect).
export async function verifyPaystackTransaction(reference: string): Promise<VerifyResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache:   'no-store',
  })

  const json = await res.json()
  if (!res.ok || !json?.status || !json?.data) {
    throw new Error(`Paystack verify failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json.data as VerifyResult
}

// Verify a webhook payload came from Paystack: HMAC-SHA512 of the raw body,
// keyed with the secret key, must equal the x-paystack-signature header.
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const hash = crypto.createHmac('sha512', secretKey()).update(rawBody).digest('hex')
  // timingSafeEqual throws if lengths differ, so guard first
  if (hash.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}

// Shared verify+update+fulfil logic — called by both the webhook and the
// user-facing return page, so an order is only ever marked completed after the
// real Paystack status has been checked. Idempotent (safe to call repeatedly).
export async function verifyAndFulfilPaystackOrder(supabase: SupabaseClient, reference: string) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, amount_total, currency, metadata')
    .eq('id', reference)
    .single()

  if (error || !order) {
    console.error('[paystack] verify: order not found', reference, error)
    return null
  }

  // Already resolved (webhook beat us here, or this is a repeat check) — no-op
  if (order.status === 'completed') {
    await fulfilDigitalOrder(supabase, order.id)
    return { status: 'completed' as const }
  }
  if (order.status === 'cancelled') {
    return { status: 'cancelled' as const }
  }

  const result = await verifyPaystackTransaction(reference)
  const metadata = (order.metadata as Record<string, unknown> | null) ?? {}

  if (result.status === 'success') {
    // Guard against amount / currency tampering
    const expected = Math.round(order.amount_total * 100)
    if (Math.abs(result.amount - expected) > 1) {
      console.error('[paystack] verify: amount mismatch', result.amount, 'vs', expected, reference)
      return { status: 'pending' as const }
    }
    if (result.currency && result.currency.toUpperCase() !== (order.currency ?? 'USD').toUpperCase()) {
      console.error('[paystack] verify: currency mismatch', result.currency, 'vs', order.currency, reference)
      return { status: 'pending' as const }
    }

    await supabase
      .from('orders')
      .update({
        status:         'completed',
        payment_method: 'paystack',
        metadata: {
          ...metadata,
          paystack_reference:   result.reference,
          paystack_channel:     (result as any).channel ?? null,
        },
      })
      .eq('id', order.id)

    await fulfilDigitalOrder(supabase, order.id)
    return { status: 'completed' as const }
  }

  if (result.status === 'failed' || result.status === 'abandoned') {
    await supabase
      .from('orders')
      .update({ status: 'cancelled', metadata: { ...metadata, paystack_status: result.status } })
      .eq('id', order.id)
    return { status: 'cancelled' as const }
  }

  // Still pending / unknown — leave as-is; the webhook or a later check resolves it
  return { status: 'pending' as const }
}
