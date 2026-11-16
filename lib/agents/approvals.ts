// Approval helpers (masterplan §3.4). Agents create approvals; the admin
// decides; act() phases execute what was approved.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requiresApproval } from './guards'
import type { AgentKey, ActionType, AutonomyLevel } from './types'

export interface CreateApprovalInput {
  agentKey: AgentKey
  actionType: ActionType
  title: string
  preview: Record<string, unknown>
}

/**
 * Create an approval, or auto-approve when the agent's autonomy allows it
 * (spending actions always require manual approval — enforced in the guard).
 * Returns the approval row id and whether it was auto-approved.
 */
export async function createApproval(
  input: CreateApprovalInput
): Promise<{ id: number; autoApproved: boolean }> {
  const supabase = createServiceRoleClient()

  const { data: agent } = await supabase
    .from('ag_agents')
    .select('autonomy')
    .eq('key', input.agentKey)
    .single()

  const autonomy = (agent?.autonomy ?? {}) as Partial<Record<ActionType, AutonomyLevel>>
  const needsApproval = requiresApproval(input.actionType, autonomy)

  const { data, error } = await supabase
    .from('ag_approvals')
    .insert({
      agent_key:   input.agentKey,
      action_type: input.actionType,
      title:       input.title,
      preview:     input.preview,
      status:      needsApproval ? 'pending' : 'approved',
      decided_at:  needsApproval ? null : new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`createApproval failed: ${error?.message}`)

  return { id: data.id, autoApproved: !needsApproval }
}

/** Approved-but-unexecuted approvals for an agent. The caller marks them executed. */
export async function getApprovedPending(agentKey: AgentKey, actionType?: ActionType) {
  const supabase = createServiceRoleClient()
  let q = supabase
    .from('ag_approvals')
    .select('id, action_type, title, preview, feedback')
    .eq('agent_key', agentKey)
    .eq('status', 'approved')
  if (actionType) q = q.eq('action_type', actionType)
  const { data } = await q.limit(20)
  return data ?? []
}

/** Mark an approval as executed (reuse `edited` status is wrong — we keep approved and log execution in the audit log). */
export async function markExecuted(approvalId: number, agentKey: AgentKey, detail: Record<string, unknown> = {}) {
  const supabase = createServiceRoleClient()
  await supabase.from('ag_audit_log').insert({
    agent_key: agentKey,
    action: 'approval_executed',
    detail: { approval_id: approvalId, ...detail },
  })
}

/** Expire stale pending approvals past their expires_at (run from tick). */
export async function expireStaleApprovals(): Promise<number> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('ag_approvals')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id')
  return data?.length ?? 0
}
