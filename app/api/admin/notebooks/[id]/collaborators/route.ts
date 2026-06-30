import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('notebook_collaborators')
    .select(`
      id, user_id, role, invited_at, accepted_at,
      profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
    `)
    .eq('notebook_id', params.id)
    .order('invited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const body = await req.json().catch(() => null)
  if (!body?.email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  // Look up the user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', body.email.toLowerCase().trim())
    .single()

  if (!profile) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })

  // Prevent adding the notebook owner as a collaborator
  const { data: notebook } = await supabase.from('notebooks').select('owner_id').eq('id', params.id).single()
  if (notebook?.owner_id === profile.id) {
    return NextResponse.json({ error: 'Cannot add the notebook owner as a collaborator' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notebook_collaborators')
    .upsert({
      notebook_id: params.id,
      user_id:     profile.id,
      role:        body.role ?? 'viewer',
      invited_at:  new Date().toISOString(),
    }, { onConflict: 'notebook_id,user_id' })
    .select(`
      id, user_id, role, invited_at, accepted_at,
      profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('notebook_activity_log').insert({
    notebook_id: params.id,
    user_id:     profile.id,
    action:      'collaborator_added',
    metadata:    { email: profile.email, role: body.role ?? 'viewer' },
  })

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const body = await req.json().catch(() => null)
  if (!body?.collaborator_id) return NextResponse.json({ error: 'collaborator_id required' }, { status: 400 })

  const { error } = await supabase
    .from('notebook_collaborators')
    .delete()
    .eq('id', body.collaborator_id)
    .eq('notebook_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
