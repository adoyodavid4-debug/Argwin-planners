// app/api/newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { headers } from 'next/headers'

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

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert({ email: parsed.data.email, source: parsed.data.source, locale: parsed.data.locale, is_active: true })

  if (error && error.code !== '23505') {  // ignore duplicate
    console.error('[newsletter]', error)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
