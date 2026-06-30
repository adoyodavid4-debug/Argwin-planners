import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value, updated_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return as flat key→value object
  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) {
    settings[row.key] = row.value
  }
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const supabase = getClient()
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value: value === undefined ? null : value,
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) return NextResponse.json({ ok: true })

  const { error } = await supabase
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
