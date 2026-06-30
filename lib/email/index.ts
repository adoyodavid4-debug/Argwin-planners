import type { EmailProvider } from './types'

let _provider: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider
  // Only Resend is implemented; extend here for Kit/MailerLite etc.
  const { ResendProvider } = require('./providers/resend')
  _provider = new ResendProvider()
  return _provider
}

export type { EmailProvider, EmailEventType, Locale } from './types'
