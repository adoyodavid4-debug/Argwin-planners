import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { paused } = await req.json() as { paused: boolean }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('ag_global_config')
    .update({ all_agents_paused: paused, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('ag_audit_log').insert({
    action: paused ? 'global_kill_switch_on' : 'global_kill_switch_off',
    detail: {},
  })

  return NextResponse.json({ ok: true, all_agents_paused: paused })
}
