import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { authorizeUrl, isConfigured, siteUrl, type Provider } from '@/lib/calendar/oauth'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// GET /api/calendar/oauth/[provider]/start — begin the consent flow.
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as Provider
  if (provider !== 'google' && provider !== 'microsoft') {
    return NextResponse.redirect(`${siteUrl()}/calendar/integrations?error=unknown_provider`)
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${siteUrl()}/auth/login?redirect=/calendar/integrations`)

  if (!isConfigured(provider)) {
    return NextResponse.redirect(`${siteUrl()}/calendar/integrations?error=not_configured&provider=${provider}`)
  }

  const state = randomBytes(16).toString('hex')
  const url = authorizeUrl(provider, state)
  if (!url) return NextResponse.redirect(`${siteUrl()}/calendar/integrations?error=not_configured&provider=${provider}`)

  const res = NextResponse.redirect(url)
  res.cookies.set(`cal_oauth_state_${provider}`, state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return res
}
