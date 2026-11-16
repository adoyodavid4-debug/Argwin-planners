import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { decision, feedback } = await req.json() as {
    decision: 'approved' | 'rejected'
    feedback?: string
  }

  if (!['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 })
  }

  // Get current user id for audit
  const supabaseAuth = createServerSupabaseClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  const supabase = createServiceRoleClient()

  // Verify the approval exists and is pending
  const { data: approval, error: fetchErr } = await supabase
    .from('ag_approvals')
    .select('id, status, agent_key, action_type, title')
    .eq('id', id)
    .single()

  if (fetchErr || !approval) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  if (approval.status !== 'pending') {
    return NextResponse.json({ error: `Approval is already ${approval.status}` }, { status: 409 })
  }

  const { error } = await supabase
    .from('ag_approvals')
    .update({
      status:     decision,
      decided_by: user?.id ?? null,
      decided_at: new Date().toISOString(),
      feedback:   feedback ?? null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('ag_audit_log').insert({
    agent_key: approval.agent_key,
    admin_id:  user?.id ?? null,
    action:    `approval_${decision}`,
    detail: {
      approval_id:  id,
      action_type:  approval.action_type,
      title:        approval.title,
      feedback:     feedback ?? null,
    },
  })

  return NextResponse.json({ ok: true, id, decision })
}
