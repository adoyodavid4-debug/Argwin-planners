// Manual agent run from the Command Centre ("Run now").
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'
import { runAgent } from '@/lib/agents/runner'
import { MODULES } from '@/lib/agents/modules'
import type { AgentKey } from '@/lib/agents/types'

export const maxDuration = 300

const VALID_KEYS = [
  'email','pinterest','listing','video',
  'ads','seo','support','bundles','trends','analyst',
]

export async function POST(_req: Request, { params }: { params: { key: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard

  if (!VALID_KEYS.includes(params.key)) {
    return NextResponse.json(
      { error: params.key === 'sales' ? 'The sales agent is event-driven (webhook + pacing) — it has no manual run' : 'Unknown agent key' },
      { status: 400 }
    )
  }

  const key = params.key as AgentKey
  const module_ = MODULES[key]
  if (!module_) return NextResponse.json({ error: 'No module registered' }, { status: 400 })

  const result = await runAgent(key, 'manual', async (ctx) => {
    await module_.plan(ctx)
    await module_.act(ctx)
    await module_.report(ctx)
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, skipped: result.skipped, error: result.error }, { status: result.skipped ? 200 : 500 })
  }
  return NextResponse.json({ ok: true, summary: result.summary })
}
