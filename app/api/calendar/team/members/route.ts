// app/api/calendar/team/members/route.ts
// Role changes (PATCH) and removals (DELETE) for team members. Runs under the
// caller's Supabase session so RLS ("members write": manage/owner) stays the
// real permission gate; this route adds the courtesy emails and audit entries
// the old direct client writes never sent.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePlan } from '@/lib/calendar/guard'
import { getEmailProvider } from '@/lib/email'
import { ROLES, type Role } from '@/lib/calendar/team'

async function requireManager() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  const denied = await requirePlan('teams', supabase)
  if (denied) return { error: denied }

  const { data: mine } = await supabase
    .from('team_members')
    .select('id, team_id, name, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
  const me = mine?.[0]
  if (!me) return { error: NextResponse.json({ error: 'You are not part of a team' }, { status: 403 }) }
  if (!['manage', 'owner'].includes(me.role)) {
    return { error: NextResponse.json({ error: 'Only Managers and Owners can manage members' }, { status: 403 }) }
  }
  const { data: team } = await supabase.from('teams').select('id, name').eq('id', me.team_id).single()
  return { supabase, me, team }
}

const patchSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(['view', 'propose', 'edit', 'manage']),
})

export async function PATCH(req: NextRequest) {
  const ctx = await requireManager()
  if ('error' in ctx) return ctx.error
  const { supabase, me, team } = ctx

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { memberId, role } = parsed.data

  const { data: target } = await supabase
    .from('team_members')
    .select('id, name, email, role, status, team_id')
    .eq('id', memberId).eq('team_id', me.team_id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.role === 'owner') return NextResponse.json({ error: "The owner's role can't be changed" }, { status: 403 })
  if (target.role === role) return NextResponse.json({ member: target, emailed: false })

  const { data: updated, error } = await supabase
    .from('team_members').update({ role }).eq('id', memberId).select('id, role').single()
  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'You don’t have permission to change roles' }, { status: 403 })
  }

  try {
    await supabase.from('team_audit_log').insert({
      team_id: me.team_id, actor_id: me.id, action: 'changed role',
      target: `${target.name} → ${ROLES[role as Role]?.label ?? role}`, scope: 'member',
    })
  } catch { /* non-fatal */ }

  // Courtesy email — active members only (invitees learn their role on joining).
  let emailed = false
  if (target.status === 'active' && target.email) {
    try {
      await getEmailProvider().sendTransactional({
        to: target.email,
        locale: 'en',
        templateKey: 'team.role_changed',
        idempotencyKey: `team-role-${memberId}-${role}-${Date.now()}`,
        category: 'info',
        data: {
          team_name: team?.name ?? 'your team',
          role_label: ROLES[role as Role]?.label ?? role,
          changed_by: me.name || 'A team manager',
        },
      })
      emailed = true
    } catch (err) {
      console.error('[team/members] role email failed:', err)
    }
  }

  return NextResponse.json({ member: updated, emailed })
}

const deleteSchema = z.object({ memberId: z.string().uuid() })

export async function DELETE(req: NextRequest) {
  const ctx = await requireManager()
  if ('error' in ctx) return ctx.error
  const { supabase, me, team } = ctx

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { memberId } = parsed.data

  const { data: target } = await supabase
    .from('team_members')
    .select('id, name, email, role, status')
    .eq('id', memberId).eq('team_id', me.team_id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.role === 'owner') return NextResponse.json({ error: "The owner can't be removed" }, { status: 403 })

  const { data: deleted, error } = await supabase
    .from('team_members').delete().eq('id', memberId).select('id')
  if (error || !deleted?.length) {
    return NextResponse.json({ error: error?.message ?? 'You don’t have permission to remove members' }, { status: 403 })
  }

  try {
    await supabase.from('team_audit_log').insert({
      team_id: me.team_id, actor_id: me.id,
      action: target.status === 'invited' ? 'revoked invite' : 'removed member',
      target: target.email ?? target.name, scope: 'member',
    })
  } catch { /* non-fatal */ }

  // Courtesy email for active members; revoking a pending invite stays silent.
  let emailed = false
  if (target.status === 'active' && target.email) {
    try {
      await getEmailProvider().sendTransactional({
        to: target.email,
        locale: 'en',
        templateKey: 'team.removed',
        idempotencyKey: `team-removed-${memberId}`,
        category: 'info',
        data: { team_name: team?.name ?? 'the team' },
      })
      emailed = true
    } catch (err) {
      console.error('[team/members] removal email failed:', err)
    }
  }

  return NextResponse.json({ ok: true, emailed })
}
