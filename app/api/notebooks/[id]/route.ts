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

// Determine the calling user's effective role on a notebook
async function getEffectiveRole(
  supabase: ReturnType<typeof serviceClient>,
  notebookId: string,
  userId: string
): Promise<'owner' | 'admin' | 'editor' | 'viewer' | null> {
  // Check if admin/super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'super_admin') return 'admin'

  // Check if owner
  const { data: nb } = await supabase
    .from('notebooks')
    .select('owner_id')
    .eq('id', notebookId)
    .single()

  if (!nb) return null
  if (nb.owner_id === userId) return 'owner'

  // Check collaborator role
  const { data: collab } = await supabase
    .from('notebook_collaborators')
    .select('role')
    .eq('notebook_id', notebookId)
    .eq('user_id', userId)
    .single()

  if (collab) return collab.role as 'editor' | 'viewer'

  // Check if notebook is public
  const { data: fullNb } = await supabase
    .from('notebooks')
    .select('visibility')
    .eq('id', notebookId)
    .single()

  if (fullNb?.visibility === 'public') return 'viewer'

  return null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const role = await getEffectiveRole(supabase, params.id, session.user.id)
  if (!role) return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 })

  const { data, error } = await supabase
    .from('notebooks')
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url),
      notebook_collaborators (id, user_id, role, invited_at, accepted_at,
        profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
      ),
      notebook_activity_log (id, user_id, action, metadata, created_at)
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ ...data, _effective_role: role })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const role = await getEffectiveRole(supabase, params.id, session.user.id)

  // Viewers cannot edit
  if (!role || role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  // Editors can only change name and description; owners/admins can change all
  const editorAllowed  = ['name', 'description']
  const ownerAllowed   = [...editorAllowed, 'cover_color', 'status', 'visibility', 'type']
  const allowedFields  = (role === 'editor') ? editorAllowed : ownerAllowed

  const patch: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) patch[key] = body[key]
  }
  patch.last_edited_by = session.user.id
  patch.updated_at     = new Date().toISOString()

  const { data, error } = await supabase
    .from('notebooks')
    .update(patch)
    .eq('id', params.id)
    .select('id, name, type, description, cover_color, status, visibility, owner_id, last_edited_by, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('notebook_activity_log').insert({
    notebook_id: params.id,
    user_id:     session.user.id,
    action:      'edited',
    metadata:    { fields: Object.keys(patch) },
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const role = await getEffectiveRole(supabase, params.id, session.user.id)

  // Only owners and admins can delete
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only the notebook owner can delete it' }, { status: 403 })
  }

  const { error } = await supabase.from('notebooks').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
