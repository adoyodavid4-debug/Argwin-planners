// Event bus helpers (masterplan §3.1 ag_events). Append-only; consumers mark
// processed_at. Cross-agent flows (§16) are wired in the tick route.
import { createServiceRoleClient } from '@/lib/supabase/server'

export type AgentEventType =
  | 'order.paid'
  | 'lead.created'
  | 'lead.won'
  | 'planner.published'
  | 'email.clicked'
  | 'pin.published'
  | 'support.issue_tagged'
  | 'seasonal.alert'

export async function emitEvent(type: AgentEventType, payload: Record<string, unknown>) {
  const supabase = createServiceRoleClient()
  await supabase.from('ag_events').insert({ type, payload })
}

/** Fetch unprocessed events (oldest first) and return them; caller must markProcessed. */
export async function fetchUnprocessed(limit = 50) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('ag_events')
    .select('id, type, payload, occurred_at')
    .is('processed_at', null)
    .order('occurred_at', { ascending: true })
    .limit(limit)
  return data ?? []
}

export async function markProcessed(ids: number[]) {
  if (ids.length === 0) return
  const supabase = createServiceRoleClient()
  await supabase
    .from('ag_events')
    .update({ processed_at: new Date().toISOString() })
    .in('id', ids)
}
