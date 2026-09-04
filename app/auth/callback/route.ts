// app/auth/callback/route.ts — completes the email-confirmation (and OAuth) link.
// Supabase sends the user here after they click the confirm link. We exchange
// the code / verify the token, which sets the session cookie, then redirect them
// on to `next` (their intended destination) instead of dumping them on the home
// page. Without this handler the link just lands on "/" unauthenticated.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') || '/'
  const safeNext = next.startsWith('/') ? next : '/' // never redirect off-site

  const supabase = createServerSupabaseClient()

  // PKCE code flow (same-browser confirmations, OAuth)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }
  // OTP token_hash flow (works across devices, if the email template uses it)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }

  // Couldn't establish a session (e.g. link opened on a different device). The
  // email is still verified by Supabase, so send them to sign in normally.
  return NextResponse.redirect(`${origin}/auth/login?confirmed=1`)
}
