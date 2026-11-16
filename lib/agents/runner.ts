// Run wrapper for every agent (masterplan §3.2): checks the global kill
// switch, the per-agent switch and the budget, takes a per-agent lock (no two
// runs overlap), records the run in ag_runs, and always finishes the record.
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AgentKey } from './types'

export interface RunContext {
  runId: number
  agentKey: AgentKey
  /** Append a line to the run summary. */
  log: (line: string) => void
}

export interface RunResult {
  ok: boolean
  skipped?: string
  summary?: string
  error?: string
}

/** Stale-lock horizon: a 'running' run older than this is treated as crashed. */
const LOCK_STALE_MINUTES = 15

export async function runAgent(
  agentKey: AgentKey,
  trigger: 'cron' | 'event' | 'manual',
  fn: (ctx: RunContext) => Promise<void>
): Promise<RunResult> {
  const supabase = createServiceRoleClient()

  // Global kill switch
  const { data: global } = await supabase
    .from('ag_global_config').select('all_agents_paused').eq('id', 1).single()
  if (global?.all_agents_paused) return { ok: false, skipped: 'global kill switch on' }

  // Agent enabled + budget
  const { data: agent } = await supabase
    .from('ag_agents')
    .select('enabled, monthly_budget_usd, budget_used_usd')
    .eq('key', agentKey)
    .single()
  if (!agent)          return { ok: false, skipped: 'agent not found' }
  if (!agent.enabled)  return { ok: false, skipped: 'agent disabled' }
  if (agent.monthly_budget_usd > 0 && agent.budget_used_usd >= agent.monthly_budget_usd) {
    return { ok: false, skipped: 'monthly budget reached' }
  }

  // Lock: refuse if a non-stale run is already 'running'
  const staleCutoff = new Date(Date.now() - LOCK_STALE_MINUTES * 60_000).toISOString()
  const { data: running } = await supabase
    .from('ag_runs')
    .select('id')
    .eq('agent_key', agentKey)
    .eq('status', 'running')
    .gt('started_at', staleCutoff)
    .limit(1)
  if (running && running.length > 0) return { ok: false, skipped: 'run already in progress' }

  // Open the run record
  const { data: run, error: insErr } = await supabase
    .from('ag_runs')
    .insert({ agent_key: agentKey, trigger, status: 'running' })
    .select('id')
    .single()
  if (insErr || !run) return { ok: false, error: `could not open run: ${insErr?.message}` }

  const lines: string[] = []
  const ctx: RunContext = { runId: run.id, agentKey, log: (l) => lines.push(l) }

  try {
    await fn(ctx)
    const summary = lines.join('\n') || 'completed'
    await supabase.from('ag_runs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      summary,
    }).eq('id', run.id)
    await supabase.from('ag_agents').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'completed',
    }).eq('key', agentKey)
    return { ok: true, summary }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('ag_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      summary: lines.join('\n') || null,
      error: msg,
    }).eq('id', run.id)
    await supabase.from('ag_agents').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'failed',
    }).eq('key', agentKey)
    return { ok: false, error: msg }
  }
}
