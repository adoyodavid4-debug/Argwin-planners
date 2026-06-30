import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const ALLOWED_FIELDS = ['name', 'type', 'description', 'cover_color', 'status', 'visibility']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('notebooks')
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url),
      notebook_collaborators (id, user_id, role, invited_at, accepted_at,
        profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
      )
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) patch[key] = body[key]
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('notebooks')
    .update(patch)
    .eq('id', params.id)
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...(data as any), owner: (data as any).profiles })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const { error } = await supabase.from('notebooks').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
