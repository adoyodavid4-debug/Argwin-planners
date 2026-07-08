import { Resend } from 'resend'
import { createHmac } from 'crypto'
import type { EmailProvider, EmailCategory, EmailEventType, Locale } from '../types'
import { resolveTemplate } from '../templates'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

const FROM_ADDRESSES: Record<EmailCategory, string> = {
  info:    process.env.EMAIL_FROM_INFO    ?? 'Arwign Planners <info@arwignplanners.com>',
  sales:   process.env.EMAIL_FROM_SALES   ?? 'Arwign Planners <sales@arwignplanners.com>',
  support: process.env.EMAIL_FROM_SUPPORT ?? 'Arwign Planners <support@arwignplanners.com>',
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
  }) {
    const { subject, html } = resolveTemplate(input.templateKey, input.locale, input.data)
    const from = FROM_ADDRESSES[input.category ?? 'info']

    const { data, error } = await this.client.emails.send({
      from,
      to: input.to,
      subject,
      html,
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
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

    const body = await req.text()
    const sig = req.headers.get('svix-signature') ?? req.headers.get('resend-signature') ?? ''

    // Resend uses svix for webhook verification
    const timestamp = req.headers.get('svix-timestamp') ?? ''
    const expectedSig = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex')

    // Compare the first element of the signature header
    const sigParts = sig.split(' ')
    const valid = sigParts.some((part) => {
      const [, value] = part.split(',')
      return value === `v1,${expectedSig}` || value === expectedSig
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

    const emailAddr = (payload.data as Record<string, unknown>)?.email_id as string
      ?? (payload.data as Record<string, unknown>)?.to as string
      ?? ''

    return {
      valid: true as const,
      email: emailAddr,
      type,
      meta: payload.data as Record<string, unknown>,
    }
  }
}
