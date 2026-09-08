// lib/supabase/admin-guard.ts — in-handler auth for /api/admin/* routes.
// Middleware also gates these paths; this is defense in depth so a middleware
// bypass (matcher gap, framework CVE) never exposes a service-role handler.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from './server'

/** Returns null when the caller is an admin; otherwise a 401/403 response to return as-is. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
