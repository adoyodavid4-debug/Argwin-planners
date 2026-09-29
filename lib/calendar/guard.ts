// lib/calendar/guard.ts — in-handler plan enforcement for paid calendar APIs.
// The /calendar/plus and /calendar/team pages are gated by their layouts; this
// is defense in depth so the paid feature endpoints can't be driven directly by
// a free account (or a stale client). Admins always pass.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPlanInfo, meetsPlan, type CalendarPlan } from './plan'

/**
 * Returns null when the caller meets (or exceeds) the required paid plan;
 * otherwise a 401 (not signed in) or 402 (upgrade required) response to return
 * as-is. Pass the route's existing Supabase client to avoid a second round-trip.
 */
export async function requirePlan(
  required: Exclude<CalendarPlan, 'free'>,
  supabase?: ReturnType<typeof createServerSupabaseClient>,
): Promise<NextResponse | null> {
  const client = supabase ?? createServerSupabaseClient()
  const info = await getPlanInfo(client)
  if (!info.signedIn) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }
  if (!meetsPlan(info, required)) {
    // Teams is owner-pays: an ACTIVE member of any team passes without a
    // personal subscription — the team can only exist because a subscriber
    // created it (RLS gate, migration 033).
    if (required === 'teams' && (await isActiveTeamMember(client))) return null
    const label = required === 'teams' ? 'Arwign Teams' : 'Arwign Plus'
    return NextResponse.json(
      { error: `${label} is required for this feature.`, upgrade: `/calendar/subscribe/${required}` },
      { status: 402 },
    )
  }
  return null
}

/** True when the signed-in user is an active member of any team. */
export async function isActiveTeamMember(
  supabase: ReturnType<typeof createServerSupabaseClient>,
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase
      .from('team_members').select('id')
      .eq('user_id', user.id).eq('status', 'active').limit(1)
    return !!data?.length
  } catch {
    return false
  }
}
