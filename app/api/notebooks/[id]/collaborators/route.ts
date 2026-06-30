import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getSession() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

async function isOwnerOrAdmin(
  supabase: ReturnType<typeof serviceClient>,
  notebookId: string,
  userId: string
): Promise<boolean> {
  const [{ data: nb }, { data: profile }] = await Promise.all([
    supabase.from('notebooks').select('owner_id').eq('id', notebookId).single(),
    supabase.from('profiles').select('role').eq('id', userId).single(),
  ])
  if (!nb) return false
  if (nb.owner_id === userId) return true
  return profile?.role === 'admin' || profile?.role === 'super_admin'
}

// GET — list collaborators (owner/admin only)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase   = serviceClient()
  const hasAccess  = await isOwnerOrAdmin(supabase, params.id, session.user.id)
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

// POST — invite a collaborator by email
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase   = serviceClient()
  const hasAccess  = await isOwnerOrAdmin(supabase, params.id, session.user.id)
  if (!hasAccess) return NextResponse.json({ error: 'Only the notebook owner can invite collaborators' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const validRoles = ['editor', 'viewer']
  const role = validRoles.includes(body.role) ? body.role : 'viewer'

  // Look up user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', body.email.toLowerCase().trim())
    .single()

  if (!profile) return NextResponse.json({ error: 'No account found with that email' }, { status: 404 })

  // Prevent inviting the owner
  const { data: nb } = await supabase.from('notebooks').select('owner_id').eq('id', params.id).single()
  if (nb?.owner_id === profile.id) {
    return NextResponse.json({ error: 'The notebook owner cannot be added as a collaborator' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notebook_collaborators')
    .upsert(
      {
        notebook_id: params.id,
        user_id:     profile.id,
        role,
        invited_by:  session.user.id,
        invited_at:  new Date().toISOString(),
      },
      { onConflict: 'notebook_id,user_id' }
    )
    .select(`
      id, user_id, role, invited_at, accepted_at,
      profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('notebook_activity_log').insert({
    notebook_id: params.id,
    user_id:     session.user.id,
    action:      'collaborator_invited',
    metadata:    { email: profile.email, role },
  })

  return NextResponse.json(data, { status: 201 })
}

// DELETE — revoke a collaborator's access
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase  = serviceClient()
  const hasAccess = await isOwnerOrAdmin(supabase, params.id, session.user.id)
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.collaborator_id) return NextResponse.json({ error: 'collaborator_id required' }, { status: 400 })

  const { error } = await supabase
    .from('notebook_collaborators')
    .delete()
    .eq('id', body.collaborator_id)
    .eq('notebook_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('notebook_activity_log').insert({
    notebook_id: params.id,
    user_id:     session.user.id,
    action:      'collaborator_removed',
    metadata:    { collaborator_id: body.collaborator_id },
  })

  return NextResponse.json({ ok: true })
}
