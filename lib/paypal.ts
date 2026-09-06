// lib/paypal.ts — PayPal REST helpers (server-side only)

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'live' || process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret   = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) throw new Error('PayPal credentials are not configured')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body:  'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`PayPal OAuth failed (${res.status}): ${await res.text()}`)
  }
  const json = await res.json()
  return json.access_token as string
}

export interface PayPalOrderResult {
  id:     string
  status: string
  [key: string]: unknown
}

// Create a PayPal order for a DB-validated USD total.
// `referenceId` is our internal orders.id so the capture can be reconciled.
export async function createPayPalOrder({
  referenceId,
  total,
  items,
}: {
  referenceId: string
  total:       number
  items:       { title: string; price: number; quantity: number }[]
}): Promise<PayPalOrderResult> {
  const token = await getAccessToken()
  const value = total.toFixed(2)

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      application_context: {
        brand_name: 'Arwign Planners',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
      purchase_units: [{
        reference_id: referenceId,
        custom_id:    referenceId,
        description:  'Arwign Planners — digital downloads',
        amount: {
          currency_code: 'USD',
          value,
          breakdown: {
            item_total: { currency_code: 'USD', value },
          },
        },
        items: items.map((i) => ({
          name:        i.title.slice(0, 127),
          quantity:    String(i.quantity),
          unit_amount: { currency_code: 'USD', value: i.price.toFixed(2) },
          category:    'DIGITAL_GOODS',
        })),
      }],
    }),
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok || !json?.id) {
    throw new Error(`PayPal create order failed (${res.status}): ${JSON.stringify(json)}`)
  }
  return json as PayPalOrderResult
}

// Capture an approved PayPal order. Returns the raw capture payload.
export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalOrderResult> {
  const token = await getAccessToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok) {
    // Surface PayPal's issue code (e.g. ORDER_ALREADY_CAPTURED) to the caller
    const issue = json?.details?.[0]?.issue ?? ''
    const err   = new Error(`PayPal capture failed (${res.status}): ${issue || JSON.stringify(json)}`)
    ;(err as Error & { issue?: string }).issue = issue
    throw err
  }
  return json as PayPalOrderResult
}

// ── Recurring subscriptions ───────────────────────────────────────────────────
export function planIdFor(plan: 'plus' | 'teams'): string | undefined {
  return plan === 'plus'
    ? process.env.NEXT_PUBLIC_PAYPAL_PLAN_PLUS_ID
    : process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID
}

// Fetch a subscription's current state (status, next_billing_time, plan_id…).
export async function getSubscription(id: string): Promise<any> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`PayPal get subscription failed (${res.status}): ${JSON.stringify(json)}`)
  return json
}

// Cancel a subscription (stops future billing; current period stays active).
export async function cancelSubscription(id: string, reason = 'Cancelled by user'): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok && res.status !== 204) {
    throw new Error(`PayPal cancel failed (${res.status}): ${await res.text().catch(() => '')}`)
  }
}

// Verify a webhook came from PayPal (needs PAYPAL_WEBHOOK_ID from the dashboard).
export async function verifyWebhookSignature(
  headers: Record<string, string | null>, event: unknown,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return false
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: event,
    }),
  })
  const json = await res.json().catch(() => ({}))
  return json.verification_status === 'SUCCESS'
}
