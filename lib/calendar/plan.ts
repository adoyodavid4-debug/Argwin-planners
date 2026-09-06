// lib/calendar/plan.ts — the user's Arwign Calendar plan and gating helpers.
// Plan lives in profiles.calendar_plan and can only be changed server-side
// (migration 021 blocks self-grants). Admins bypass gating for support/testing.

export type CalendarPlan = 'free' | 'plus' | 'teams'

export const PLAN_RANK: Record<CalendarPlan, number> = { free: 0, plus: 1, teams: 2 }
export const PLAN_LABEL: Record<CalendarPlan, string> = { free: 'Arwign Free', plus: 'Arwign Plus', teams: 'Arwign Teams' }

export interface PlanInfo {
  plan: CalendarPlan
  isAdmin: boolean
  signedIn: boolean
}

function normalise(v: unknown): CalendarPlan {
  return v === 'plus' || v === 'teams' ? v : 'free'
}

// Works with either the server or browser Supabase client (loosely typed to
// match the project's `createClient() as any` convention).
export async function getPlanInfo(supabase: any): Promise<PlanInfo> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { plan: 'free', isAdmin: false, signedIn: false }
    const { data } = await supabase
      .from('profiles')
      .select('calendar_plan, role')
      .eq('id', user.id)
      .maybeSingle()
    const isAdmin = data?.role === 'admin' || data?.role === 'super_admin'
    return { plan: normalise(data?.calendar_plan), isAdmin, signedIn: true }
  } catch {
    return { plan: 'free', isAdmin: false, signedIn: false }
  }
}

// Does this user meet (or exceed) the required tier? Admins always pass.
export function meetsPlan(info: PlanInfo, required: CalendarPlan): boolean {
  return info.isAdmin || PLAN_RANK[info.plan] >= PLAN_RANK[required]
}
