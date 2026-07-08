import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { z } from 'zod'
import { headers } from 'next/headers'

const schema = z.object({
  name:     z.string().min(1).max(120),
  email:    z.string().email(),
  subject:  z.string().max(150).optional(),
  message:  z.string().min(10).max(2000),
  honeypot: z.string().max(0, 'Bot detected'),
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

  const { name, email, subject, message } = parsed.data
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, subject: subject || null, message })

  if (error) {
    console.error('[contact]', error)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    try {
      const provider = getEmailProvider()
      await provider.sendTransactional({
        to: adminEmail,
        locale: 'en',
        templateKey: 'contact.admin',
        data: { name, email, subject, message },
        idempotencyKey: `contact:${email}:${message.slice(0, 40)}`,
      })
    } catch (err) {
      console.error('[contact] admin notification failed:', err)
      // Don't fail the request — the message is saved either way
    }
  }

  return NextResponse.json({ success: true })
}
