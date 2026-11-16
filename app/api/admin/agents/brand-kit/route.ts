import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { invalidateBrandKitCache } from '@/lib/agents/llm'

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const body = await req.json() as {
    voice_rules?:      string
    uk_spelling_note?: string
    disclaimers?:      string
    banned_phrases?:   string[]
    approved_claims?:  string[]
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.voice_rules      !== undefined) update.voice_rules      = body.voice_rules
  if (body.uk_spelling_note !== undefined) update.uk_spelling_note = body.uk_spelling_note
  if (body.disclaimers      !== undefined) update.disclaimers      = body.disclaimers
  if (body.banned_phrases   !== undefined) update.banned_phrases   = body.banned_phrases
  if (body.approved_claims  !== undefined) update.approved_claims  = body.approved_claims

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ag_brand_kit').update(update).eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Invalidate the in-process cache so the next LLM call picks up the new kit
  invalidateBrandKitCache()

  await supabase.from('ag_audit_log').insert({
    action: 'brand_kit_updated',
    detail: { fields: Object.keys(update).filter(k => k !== 'updated_at') },
  })

  return NextResponse.json({ ok: true })
}
