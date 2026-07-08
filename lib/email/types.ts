export type Locale = 'en' | 'fr'

export type EmailCategory = 'info' | 'sales' | 'support'

export type EmailEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complaint'
  | 'unsubscribed'

export interface EmailProvider {
  readonly id: string

  sendTransactional(input: {
    to: string
    locale: Locale
    templateKey: string
    data: Record<string, unknown>
    idempotencyKey: string
    category?: EmailCategory
  }): Promise<{ messageId: string }>

  upsertContact(input: {
    email: string
    attributes: Record<string, unknown>
    tags?: string[]
    consent: { at: string; source: string }
  }): Promise<{ contactId: string }>

  verifyAndParseWebhook(req: Request): Promise<
    | { valid: false }
    | { valid: true; email: string; type: EmailEventType; meta?: Record<string, unknown> }
  >
}
