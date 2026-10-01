// lib/newsletter-unsub.ts — stateless unsubscribe links for newsletter_subscribers.
// That table has no token column, so instead of a DB migration we sign the
// subscriber's email with an HMAC keyed by a server-only secret. The signature
// is unforgeable (secret never leaves the server) and needs no stored state,
// so the subscribe path can't be broken by a missing column/migration.
import { createHmac, timingSafeEqual } from 'crypto'

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const norm = (email: string) => email.toLowerCase().trim()

export function signNewsletterEmail(email: string): string {
  return createHmac('sha256', secret()).update(norm(email)).digest('hex')
}

export function verifyNewsletterSig(email: string, token: string): boolean {
  if (!email || !token || !secret()) return false
  const expected = signNewsletterEmail(email)
  if (token.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}
