const MPESA_BASE =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

// ── Auth token ───────────────────────────────────────────────
export async function getMpesaToken(): Promise<string> {
  const key    = process.env.MPESA_CONSUMER_KEY    ?? ''
  const secret = process.env.MPESA_CONSUMER_SECRET ?? ''
  const creds  = Buffer.from(`${key}:${secret}`).toString('base64')

  const res  = await fetch(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
    cache:   'no-store',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`M-Pesa token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── Helpers ──────────────────────────────────────────────────
export function getMpesaTimestamp(): string {
  return new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
}

export function getMpesaPassword(timestamp: string): string {
  const shortcode = process.env.MPESA_SHORTCODE ?? ''
  const passkey   = process.env.MPESA_PASSKEY   ?? ''
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
}

export function formatPhone(raw: string): string {
  let p = raw.replace(/[\s\-()]/g, '')
  if (p.startsWith('+'))  p = p.slice(1)
  if (p.startsWith('07') || p.startsWith('01')) p = '254' + p.slice(1)
  if (p.startsWith('7')  || p.startsWith('1'))  p = '254' + p
  return p
}

// ── STK Push ─────────────────────────────────────────────────
export interface StkPushParams {
  phone:            string
  amountKes:        number
  accountReference: string
  description:      string
  callbackUrl:      string
}

export async function initiateStkPush(params: StkPushParams) {
  const token     = await getMpesaToken()
  const timestamp = getMpesaTimestamp()
  const password  = getMpesaPassword(timestamp)

  const res = await fetch(`${MPESA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            Math.max(1, Math.round(params.amountKes)),
      PartyA:            formatPhone(params.phone),
      PartyB:            process.env.MPESA_SHORTCODE,
      PhoneNumber:       formatPhone(params.phone),
      CallBackURL:       params.callbackUrl,
      AccountReference:  params.accountReference.slice(0, 12),
      TransactionDesc:   params.description.slice(0, 13),
    }),
  })
  return res.json()
}

// ── STK Query ────────────────────────────────────────────────
export async function queryStkStatus(checkoutRequestId: string) {
  const token     = await getMpesaToken()
  const timestamp = getMpesaTimestamp()
  const password  = getMpesaPassword(timestamp)

  const res = await fetch(`${MPESA_BASE}/mpesa/stkpushquery/v1/query`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  })
  return res.json()
}
