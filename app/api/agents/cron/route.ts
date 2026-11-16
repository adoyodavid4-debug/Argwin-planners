// agent-cron — daily per-agent runs (masterplan §3.2). For every enabled
// agent with a module, run plan → act → report through the runner (which
// enforces kill switches, budgets and locks). Protected by CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { runAgent } from '@/lib/agents/runner'
import { MODULES } from '@/lib/agents/modules'
import type { AgentKey } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const only = req.nextUrl.searchParams.get('agent') as AgentKey | null
  const supabase = createServiceRoleClient()

  const { data: agents } = await supabase
    .from('ag_agents')
    .select('key, enabled')
    .eq('enabled', true)
    .order('phase')

  const results: Record<string, unknown> = {}
  for (const agent of agents ?? []) {
    const key = agent.key as AgentKey
    if (only && key !== only) continue
    const module_ = MODULES[key]
    if (!module_) continue   // 'sales' is event-driven; skip here

    const result = await runAgent(key, 'cron', async (ctx) => {
      await module_.plan(ctx)
      await module_.act(ctx)
      await module_.report(ctx)
    })
    results[key] = result.ok ? 'ok' : (result.skipped ?? result.error)
  }

  return NextResponse.json({ ok: true, results })
}
