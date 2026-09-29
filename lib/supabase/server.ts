// lib/supabase/server.ts — server-side client (RSC + API routes)
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const cookieHandlers = (cookieStore: ReturnType<typeof cookies>) => ({
  get(name: string) { return cookieStore.get(name)?.value },
  set(name: string, value: string, options: object) { try { cookieStore.set({ name, value, ...options }) } catch {} },
  remove(name: string, options: object) { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
})

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieHandlers(cookieStore) }
  )
}

export function createServiceRoleClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: cookieHandlers(cookieStore) }
  )
}

// True service-role client that ALWAYS bypasses RLS.
//
// Unlike createServiceRoleClient (which wraps @supabase/ssr and reads the auth
// cookie), this uses the plain supabase-js client with no cookie handling, so
// the service_role key is used as the Authorization bearer even when a user is
// signed in. Use this when a logged-in user must read/write rows they have no
// RLS access to yet — e.g. accepting a team invite before they're a member.
// Do NOT call .auth.getUser() on it; use createServerSupabaseClient() for that.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
