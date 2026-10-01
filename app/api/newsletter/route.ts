// app/api/newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { signNewsletterEmail } from '@/lib/newsletter-unsub'
import { z } from 'zod'
import { headers } from 'next/headers'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL
  ?? process.env.NEXT_PUBLIC_SITE_URL
  ?? 'https://www.arwignplanners.com'

const schema = z.object({
  email:  z.string().email(),
  source: z.string().optional().default('unknown'),
  locale: z.string().optional().default('en'),
})

// Simple in-memory rate limit (per IP, per 10 min window)
const rateLimitMap = new Map<string, { count: number; reset: number }>()

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const limit = rateLimitMap.get(ip)
  if (!limit || now > limit.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 10 * 60 * 1000 })
    return false
  }
  if (limit.count >= 3) return true
  limit.count++
  return false
}

export async function POST(req: NextRequest) {
  // Rate limit
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Validate body
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const email  = parsed.data.email.toLowerCase().trim()
  const locale: 'en' | 'fr' = parsed.data.locale === 'fr' ? 'fr' : 'en'

  // createAdminClient (NOT createServiceRoleClient): public endpoint that must
  // write regardless of who's signed in — the ssr client would forward a
  // signed-in user's JWT and RLS would block the ON CONFLICT UPDATE.
  const supabase = createAdminClient()

  // Only first-time or re-activating subscribers get the welcome email — a
  // re-submit from an already-active address stays silent.
  const { data: before } = await supabase
    .from('newsletter_subscribers')
    .select('is_active')
    .eq('email', email)
    .maybeSingle()
  const shouldWelcome = !before || before.is_active === false

  // onConflict on email: without it the upsert conflicts on the fresh PK (never),
  // raises 23505 for existing addresses, and a previously unsubscribed
  // (is_active=false) address could never re-activate.
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      { email, source: parsed.data.source, locale, is_active: true },
      { onConflict: 'email' }
    )

  if (error && error.code !== '23505') {  // ignore duplicate
    console.error('[newsletter]', error)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }

  // Welcome email — best-effort; never fail the subscribe on an email hiccup.
  if (shouldWelcome) {
    try {
      const unsubscribe_url =
        `${APP_URL}/api/newsletter/unsubscribe?e=${encodeURIComponent(email)}&t=${signNewsletterEmail(email)}`
      await getEmailProvider().sendTransactional({
        to: email,
        locale,
        templateKey: 'newsletter.welcome',
        idempotencyKey: `newsletter-welcome:${email}`,
        category: 'info',
        data: { unsubscribe_url },
      })
    } catch (err) {
      console.error('[newsletter] welcome email failed:', err)
    }
  }

  return NextResponse.json({ success: true })
}
