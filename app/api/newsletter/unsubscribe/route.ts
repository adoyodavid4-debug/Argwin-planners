// app/api/newsletter/unsubscribe/route.ts
// One-click unsubscribe for newsletter_subscribers. The link in the welcome
// email carries the subscriber's email (e) plus an HMAC signature (t); we
// re-sign e and compare, so no DB token column is needed and the link can't be
// forged to unsubscribe someone else. Always redirects to /unsubscribed.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyNewsletterSig } from '@/lib/newsletter-unsub'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('e') ?? '').toLowerCase().trim()
  const token = req.nextUrl.searchParams.get('t') ?? ''
  const dest  = new URL('/unsubscribed', req.url)

  if (!verifyNewsletterSig(email, token)) {
    // Invalid/forged link — don't reveal which; just land on the friendly page.
    return NextResponse.redirect(dest)
  }

  try {
    const supabase = createAdminClient()
    await supabase.from('newsletter_subscribers').update({ is_active: false }).eq('email', email)
  } catch (err) {
    console.error('[newsletter/unsubscribe]', err)
  }

  return NextResponse.redirect(dest)
}
