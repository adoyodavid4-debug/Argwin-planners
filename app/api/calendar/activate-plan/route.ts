// app/api/calendar/activate-plan/route.ts
// Post-checkout activation hook: sets the signed-in user's calendar_plan.
// calendar_plan is server-controlled (migration 021 blocks self-grants over
// RLS), so plan changes must go through here.
//
// NOTE: when billing is live, verify a completed payment / active subscription
// for this user before activating — do not trust the client's requested plan.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ plan: z.enum(['plus', 'teams']) })

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceRoleClient()
  const { error } = await service
    .from('profiles')
    .update({ calendar_plan: parsed.data.plan })
    .eq('id', user.id)

  if (error) {
    console.error('[activate-plan]', error)
    return NextResponse.json({ error: 'Could not activate plan' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, plan: parsed.data.plan })
}
