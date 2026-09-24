import { Resend } from 'resend'
import { createHmac, timingSafeEqual } from 'crypto'
import type { EmailProvider, EmailCategory, EmailEventType, Locale } from '../types'
import { resolveTemplate } from '../templates'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.arwignplanners.com'

// Single fallback sender: use FROM_EMAIL / EMAIL_FROM when the per-category
// addresses aren't set, so a one-line env config still sends. Once the domain is
// verified in Resend, any address @arwignplanners.com is a valid sender.
// Empty-string env vars (e.g. `EMAIL_FROM_INFO=` in a copied .env) count as
// unset — `??` alone would keep '' and break every send.
function envAddr(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]?.trim()
    if (v) return v
  }
  return undefined
}

const DEFAULT_FROM =
  envAddr('FROM_EMAIL', 'EMAIL_FROM') ?? 'Arwign Planners <hello@arwignplanners.com>'

const FROM_ADDRESSES: Record<EmailCategory, string> = {
  info:    envAddr('EMAIL_FROM_INFO')    ?? DEFAULT_FROM,
  sales:   envAddr('EMAIL_FROM_SALES')   ?? DEFAULT_FROM,
  support: envAddr('EMAIL_FROM_SUPPORT') ?? DEFAULT_FROM,
}

export class ResendProvider implements EmailProvider {
  readonly id = 'resend'
  private client: Resend

  constructor() {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
    this.client = new Resend(process.env.RESEND_API_KEY)
  }

  async sendTransactional(input: {
    to: string
    locale: Locale
    templateKey: string
    data: Record<string, unknown>
    idempotencyKey: string
    category?: EmailCategory
    attachments?: { filename: string; content: Buffer | string }[]
  }) {
    const { subject, html } = resolveTemplate(input.templateKey, input.locale, input.data)
    const from = FROM_ADDRESSES[input.category ?? 'info']

    const { data, error } = await this.client.emails.send({
      from,
      to: input.to,
      subject,
      html,
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    })

    if (error || !data) {
      throw new Error(`Resend sendTransactional failed: ${error?.message ?? 'unknown'}`)
    }

    return { messageId: data.id }
  }

  async upsertContact(input: {
    email: string
    attributes: Record<string, unknown>
    tags?: string[]
    consent: { at: string; source: string }
  }) {
    // Resend contacts API — audienceId required
    const audienceId = process.env.RESEND_AUDIENCE_ID
    if (!audienceId) return { contactId: input.email } // graceful no-op if not configured

    const { data, error } = await this.client.contacts.create({
      audienceId,
      email: input.email,
      firstName: (input.attributes.first_name as string) ?? undefined,
      unsubscribed: false,
    })

    if (error || !data) {
      console.warn('[resend] upsertContact failed:', error?.message)
      return { contactId: input.email }
    }

    return { contactId: data.id }
  }

  async verifyAndParseWebhook(req: Request) {
    const secret = process.env.EMAIL_WEBHOOK_SECRET
    if (!secret) return { valid: false as const }

    // Resend signs webhooks with Svix. Verification requires the RAW body plus
    // the three svix-* headers; the signed content is `id.timestamp.body`.
    const body          = await req.text()
    const svixId        = req.headers.get('svix-id') ?? ''
    const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
    const svixSignature = req.headers.get('svix-signature') ?? ''
    if (!svixId || !svixTimestamp || !svixSignature) return { valid: false as const }

    // The signing secret from the Resend dashboard is `whsec_<base64>`; the HMAC
    // key is the base64-decoded portion after the prefix.
    const secretKey = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const signedContent = `${svixId}.${svixTimestamp}.${body}`
    const expected = createHmac('sha256', secretKey).update(signedContent).digest('base64')

    // Header is space-separated "v1,<base64sig>" tokens (key rotation → several).
    const valid = svixSignature.split(' ').some((token) => {
      const comma = token.indexOf(',')
      if (comma < 0) return false
      const version = token.slice(0, comma)
      const sig     = token.slice(comma + 1)
      if (version !== 'v1' || !sig) return false
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      return a.length === b.length && timingSafeEqual(a, b)
    })
    if (!valid) return { valid: false as const }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(body)
    } catch {
      return { valid: false as const }
    }

    const typeMap: Record<string, EmailEventType> = {
      'email.delivered':    'delivered',
      'email.opened':       'opened',
      'email.clicked':      'clicked',
      'email.bounced':      'bounced',
      'email.complained':   'complaint',
      'email.unsubscribed': 'unsubscribed',
    }

    const rawType = payload.type as string
    const type = typeMap[rawType]
    if (!type) return { valid: false as const }

    // Recipient lives in data.to (an array of addresses); email_id is the Resend
    // message id, not an address — never use it for subscriber lookup.
    const data = (payload.data as Record<string, unknown>) ?? {}
    const to   = data.to
    const emailAddr = Array.isArray(to) ? String(to[0] ?? '') : String(to ?? '')

    return {
      valid: true as const,
      email: emailAddr,
      type,
      meta: data,
    }
  }
}
