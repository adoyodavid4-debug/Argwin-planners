// lib/sms.ts — Twilio SMS sender (server-side only), via the REST API so we
// don't pull in the Twilio SDK. Mirrors the fetch-based style of lib/paypal.ts.
//
// Configure with either a Messaging Service (recommended for delivery/sender
// pooling) OR a single From number:
//   TWILIO_ACCOUNT_SID           ACxxxx…
//   TWILIO_AUTH_TOKEN            (secret)
//   TWILIO_MESSAGING_SERVICE_SID MGxxxx…   (preferred)
//   TWILIO_FROM_NUMBER          +1234567890 (fallback if no messaging service)

const SID   = process.env.TWILIO_ACCOUNT_SID
const TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM  = process.env.TWILIO_FROM_NUMBER
const MSID  = process.env.TWILIO_MESSAGING_SERVICE_SID

// True only when enough is configured to actually send. Callers should gate on
// this so an unconfigured environment silently skips SMS instead of throwing.
export function smsConfigured(): boolean {
  return Boolean(SID && TOKEN && (MSID || FROM))
}

export interface SendSmsResult {
  sid:    string
  status: string
}

export async function sendSms({ to, body }: { to: string; body: string }): Promise<SendSmsResult> {
  if (!SID || !TOKEN || !(MSID || FROM)) {
    throw new Error('Twilio is not configured')
  }

  const params = new URLSearchParams()
  params.set('To', to)
  if (MSID) params.set('MessagingServiceSid', MSID)
  else      params.set('From', FROM!)
  params.set('Body', body)

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body:  params.toString(),
    cache: 'no-store',
  })

  const json = await res.json().catch(() => ({}))
  // Twilio returns 201 on queued/accepted; a body-level `status: failed` or an
  // `error_message` means it won't be delivered.
  if (!res.ok || json?.status === 'failed' || json?.error_code) {
    throw new Error(`Twilio send failed (${res.status}): ${json?.message ?? json?.error_message ?? JSON.stringify(json)}`)
  }
  return { sid: json.sid, status: json.status }
}
