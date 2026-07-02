// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const ADMIN_ROUTES   = ['/admin']
const AUTH_ROUTES    = ['/customer/dashboard', '/customer/notebooks']
const PUBLIC_AUTH    = ['/auth/login', '/auth/register', '/auth/forgot-password']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // ── Supabase session refresh ──────────────────────────────
  // Runs on every route (see matcher), so any throw here would 500 the
  // ENTIRE site with MIDDLEWARE_INVOCATION_FAILED. Guard it and fail open:
  // a transient Supabase/cold-start/env hiccup degrades to "no session"
  // rather than taking the whole app down.
  let session = null
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get: (name) => req.cookies.get(name)?.value,
          set: (name, value, opts) => {
            res.cookies.set({ name, value, ...opts })
          },
          remove: (name, opts) => {
            res.cookies.set({ name, value: '', ...opts })
          },
        },
      })

      const { data } = await supabase.auth.getSession()
      session = data.session
    }
  } catch (err) {
    // Never let an auth hiccup crash the middleware.
    console.error('[middleware] session refresh failed, failing open:', err)
  }

  // ── Admin protection ──────────────────────────────────────
  // TODO: restore when /auth/login page is built
  // if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) { ... }

  // ── Customer auth protection ──────────────────────────────
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!session) {
      return NextResponse.redirect(new URL(`/auth/login?redirect=${encodeURIComponent(pathname)}`, req.url))
    }
  }

  // ── Redirect logged-in users from auth pages ──────────────
  if (PUBLIC_AUTH.includes(pathname) && session) {
    return NextResponse.redirect(new URL('/customer/dashboard', req.url))
  }

  // ── Security headers added in next.config.js ─────────────
  // Additional runtime header for API routes
  if (pathname.startsWith('/api/')) {
    // Reject requests without proper origin (simple CSRF protection)
    const origin = req.headers.get('origin')
    const host   = req.headers.get('host')

    if (origin && host && !origin.includes(host.split(':')[0])) {
      // Allow Stripe webhooks
      if (!pathname.startsWith('/api/webhooks/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    // Match everything except static files and Next internals
    '/((?!_next/static|_next/image|favicon.ico|site.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)).*)',
  ],
}
