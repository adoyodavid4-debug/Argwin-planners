// app/api/calendar/team/invite/route.ts
// Invites a teammate: creates the team_members row (status 'invited') and
// sends the invite email. Runs under the CALLER's Supabase session, so RLS
// ("members write": manage/owner only) is the real permission gate — this
// route just adds clear error messages and the email the old client-side
// insert never sent.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePlan } from '@/lib/calendar/guard'
import { getEmailProvider } from '@/lib/email'
import { ROLES, type Role } from '@/lib/calendar/team'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL
  ?? process.env.NEXT_PUBLIC_SITE_URL
  ?? 'https://www.arwignplanners.com'

const schema = z.object({
  email: z.string().email().max(254),
  role: z.enum(['view', 'propose', 'edit', 'manage']),
})

// Deterministic avatar tint — mirrors hueFrom() in lib/calendar/team.ts.
const hueFrom = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const denied = await requirePlan('teams', supabase); if (denied) return denied

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  const email = parsed.data.email.trim().toLowerCase()
  const role: Role = parsed.data.role

  // Caller's active membership → team + permission context
  const { data: mine } = await supabase
    .from('team_members')
    .select('id, team_id, name, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
  const me = mine?.[0]
  if (!me) return NextResponse.json({ error: 'You are not part of a team yet' }, { status: 403 })
  if (!['manage', 'owner'].includes(me.role)) {
    return NextResponse.json({ error: 'Only Managers and Owners can invite members' }, { status: 403 })
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, timezone')
    .eq('id', me.team_id)
    .single()
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  // Create the invited row (RLS re-checks manage/owner on write).
  const { data: member, error: insErr } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      email,
      name: email.split('@')[0],
      role,
      status: 'invited',
      timezone: team.timezone,
      hue: hueFrom(email),
    })
    .select('id, name, email, role, status, timezone, tz_offset, hue')
    .single()

  if (insErr || !member) {
    if (insErr?.code === '23505') {
      return NextResponse.json({ error: 'That email is already a member or has a pending invite' }, { status: 409 })
    }
    return NextResponse.json({ error: insErr?.message ?? 'Could not create the invite' }, { status: 400 })
  }

  // Audit trail (best-effort)
  try {
    await supabase.from('team_audit_log').insert({
      team_id: team.id, actor_id: me.id, action: 'invited member', target: email, scope: 'member',
    })
  } catch { /* non-fatal */ }

  // The email that was previously never sent.
  let emailed = true
  try {
    await getEmailProvider().sendTransactional({
      to: email,
      locale: 'en',
      templateKey: 'team.invite',
      idempotencyKey: `team-invite-${member.id}`,
      category: 'info',
      data: {
        inviter_name: me.name || 'A teammate',
        team_name: team.name,
        role_label: ROLES[role]?.label ?? role,
        invited_email: email,
        accept_url: `${APP_URL}/calendar/join?m=${member.id}`,
      },
    })
  } catch (err) {
    console.error('[team/invite] email failed:', err)
    emailed = false
  }

  return NextResponse.json({ member, emailed })
}
