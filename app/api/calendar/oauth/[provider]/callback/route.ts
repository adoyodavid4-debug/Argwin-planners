import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { exchangeCode, emailFromIdToken, siteUrl, type Provider } from '@/lib/calendar/oauth'

export const dynamic = 'force-dynamic'

// GET /api/calendar/oauth/[provider]/callback — exchange code, store tokens.
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as Provider
  const base = `${siteUrl()}/calendar/integrations`
  if (provider !== 'google' && provider !== 'microsoft') return NextResponse.redirect(`${base}?error=unknown_provider`)

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const err = req.nextUrl.searchParams.get('error')
  if (err) return NextResponse.redirect(`${base}?error=${encodeURIComponent(err)}`)
  if (!code || !state) return NextResponse.redirect(`${base}?error=missing_code`)

  const cookieState = req.cookies.get(`cal_oauth_state_${provider}`)?.value
  if (!cookieState || cookieState !== state) return NextResponse.redirect(`${base}?error=bad_state`)

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${siteUrl()}/auth/login?redirect=/calendar/integrations`)

  const tokens = await exchangeCode(provider, code)
  if (!tokens) return NextResponse.redirect(`${base}?error=token_exchange_failed`)

  const accountEmail = emailFromIdToken(tokens.id_token)
  const meta = { expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString() }

  await supabase.from('calendar_integrations').upsert({
    user_id: user.id,
    provider,
    status: 'connected',
    account_email: accountEmail,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    scopes: [],
    sync_token: null, // reset — next sync does a full pull
    meta,
  }, { onConflict: 'user_id,provider' })

  const res = NextResponse.redirect(`${base}?connected=${provider}`)
  res.cookies.delete(`cal_oauth_state_${provider}`)
  return res
}
