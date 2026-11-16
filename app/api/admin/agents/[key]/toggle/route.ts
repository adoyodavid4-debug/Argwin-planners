import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'

const VALID_KEYS = [
  'sales','email','pinterest','listing','video',
  'ads','seo','support','bundles','trends','analyst',
]

export async function POST(req: Request, { params }: { params: { key: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard

  if (!VALID_KEYS.includes(params.key)) {
    return NextResponse.json({ error: 'Unknown agent key' }, { status: 404 })
  }

  const { enabled } = await req.json() as { enabled: boolean }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('ag_agents')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('key', params.key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('ag_audit_log').insert({
    agent_key: params.key,
    action: enabled ? 'agent_enabled' : 'agent_disabled',
    detail: {},
  })

  return NextResponse.json({ ok: true, key: params.key, enabled })
}

/** PATCH — update autonomy, budget, model */
export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard

  if (!VALID_KEYS.includes(params.key)) {
    return NextResponse.json({ error: 'Unknown agent key' }, { status: 404 })
  }

  const body = await req.json() as {
    autonomy?: Record<string, string>
    monthly_budget_usd?: number
    model?: string | null
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.autonomy            !== undefined) update.autonomy            = body.autonomy
  if (body.monthly_budget_usd  !== undefined) update.monthly_budget_usd  = body.monthly_budget_usd
  if (body.model               !== undefined) update.model               = body.model

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ag_agents').update(update).eq('key', params.key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('ag_audit_log').insert({
    agent_key: params.key,
    action: 'agent_settings_updated',
    detail: update,
  })

  return NextResponse.json({ ok: true })
}

/** PUT — save a new prompt version */
export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard

  if (!VALID_KEYS.includes(params.key)) {
    return NextResponse.json({ error: 'Unknown agent key' }, { status: 404 })
  }

  const { prompt, version } = await req.json() as { prompt: string; version: number }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ag_prompts').insert({
    agent_key: params.key,
    version,
    content: prompt,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, version })
}
