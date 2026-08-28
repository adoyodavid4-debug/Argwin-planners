// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const ADMIN_ROUTES   = ['/admin']
const AUTH_ROUTES    = ['/customer/dashboard', '/customer/notebooks']
const PUBLIC_AUTH    = ['/auth/login', '/auth/register', '/auth/forgot-password']

// Cap every Supabase network call. A paused/unreachable backend must NOT be
// able to hang the Edge middleware — that is what produces a site-wide
// MIDDLEWARE_INVOCATION_TIMEOUT (504). On timeout we reject, the catch below
// fails open ("no session"), and the request proceeds.
const SUPABASE_TIMEOUT_MS = 2500
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[middleware] ${label} timed out after ${ms}ms`)), ms),
    ),
  ])
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const isAdminPage  = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
  const isAdminApi   = pathname.startsWith('/api/admin')
  const isAuthRoute  = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  const isPublicAuth = PUBLIC_AUTH.includes(pathname)

  // ── Session is only needed on protected / auth routes ─────
  // Public pages (home, shop, product, blog, generic API) must never depend
  // on Supabase — otherwise a backend outage 504s the ENTIRE site. We only
  // reach out to Supabase for routes that actually gate on a session.
  const needsSession = isAdminPage || isAdminApi || isAuthRoute || isPublicAuth

  let session = null
  let supabase: ReturnType<typeof createServerClient> | null = null

  if (needsSession) {
    // Guard BOTH throws and hangs: a transient Supabase/cold-start/env hiccup
    // degrades to "no session" (fail open) rather than taking the app down.
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseAnonKey) {
        supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SUPABASE_TIMEOUT_MS,
          'getSession',
        )
        session = data.session
      }
    } catch (err) {
      // Never let an auth hiccup crash the middleware.
      console.error('[middleware] session refresh failed, failing open:', err)
    }
  }

  // ── Admin protection ──────────────────────────────────────
  // Both /admin pages and /api/admin routes require a signed-in user whose
  // profile role is admin or super_admin. The role is read with the user's
  // own session client (RLS lets users read their own profile row).
  if (isAdminPage || isAdminApi) {
    const deny = () =>
      isAdminApi
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL(`/auth/login?redirect=${encodeURIComponent(pathname)}`, req.url))

    if (!session || !supabase) return deny()

    let role: string | null = null
    try {
      const { data: profile } = await withTimeout(
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single(),
        SUPABASE_TIMEOUT_MS,
        'admin role check',
      )
      role = (profile as { role?: string } | null)?.role ?? null
    } catch (err) {
      console.error('[middleware] admin role check failed:', err)
    }

    if (role !== 'admin' && role !== 'super_admin') return deny()
  }

  // ── Customer auth protection ──────────────────────────────
  if (isAuthRoute) {
    if (!session) {
      return NextResponse.redirect(new URL(`/auth/login?redirect=${encodeURIComponent(pathname)}`, req.url))
    }
  }

  // ── Redirect logged-in users from auth pages ──────────────
  if (isPublicAuth && session) {
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
