// lib/supabase/server.ts — server-side client (RSC + API routes)
import { createServerClient } from '@supabase/ssr'
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
