import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { z } from 'zod'
import { headers } from 'next/headers'
import { randomBytes } from 'crypto'

const schema = z.object({
  email:          z.string().email(),
  locale:         z.enum(['en', 'fr']).default('en'),
  lead_magnet_id: z.string().uuid().optional(),
  utm:            z.record(z.string()).optional(),
  consent_text:   z.string().min(1),
  honeypot:       z.string().max(0, 'Bot detected'),   // must be empty
})

// In-memory rate limit per IP (3 submissions per 10 min window)
const rl = new Map<string, { count: number; reset: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rl.get(ip)
  if (!entry || now > entry.reset) {
    rl.set(ip, { count: 1, reset: now + 10 * 60_000 })
    return false
  }
  if (entry.count >= 3) return true
  entry.count++
  return false
}

export async function POST(req: NextRequest) {
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, locale, lead_magnet_id, utm, consent_text } = parsed.data
  const supabase = createServiceRoleClient()

  // Resolve lead magnet title for email
  let magnetTitle: string | undefined
  if (lead_magnet_id) {
    const { data: lm } = await supabase
      .from('lead_magnets')
      .select('title_i18n')
      .eq('id', lead_magnet_id)
      .single()
    if (lm) magnetTitle = (lm.title_i18n as Record<string, string>)[locale]
  }

  // Generate opt-in token (expires 24 h)
  const token = randomBytes(32).toString('hex')
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60_000).toISOString()

  // Upsert subscriber (pending; idempotent on email)
  const { data: sub, error } = await supabase
    .from('subscribers')
    .upsert(
      {
        email,
        locale,
        status: 'pending',
        source_lead_magnet_id: lead_magnet_id ?? null,
        utm: utm ?? {},
        consent_at: new Date().toISOString(),
        consent_text,
        optin_token: token,
        optin_token_expires_at: tokenExpires,
      },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[optin]', error)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }

  // Send confirmation email (idempotent — keyed on subscriber id + 'confirm')
  try {
    const provider = getEmailProvider()
    await provider.sendTransactional({
      to: email,
      locale,
      templateKey: 'optin.confirm',
      data: { token, magnet_title: magnetTitle },
      idempotencyKey: `${sub.id}:confirm`,
      category: 'sales',
    })
  } catch (err) {
    console.error('[optin] sendTransactional failed:', err)
    // Don't fail the request — the subscriber is saved, retry is possible
  }

  return NextResponse.json({ success: true })
}
