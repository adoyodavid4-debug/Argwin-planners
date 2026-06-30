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

// GET /api/notebooks — list calling user's notebooks + shared with them
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const userId = session.user.id

  // Notebooks owned by the user
  const { data: owned, error: e1 } = await supabase
    .from('notebooks')
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url),
      notebook_collaborators (id, user_id, role,
        profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
      )
    `)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  // Notebooks shared with the user
  const { data: shared, error: e2 } = await supabase
    .from('notebook_collaborators')
    .select(`
      role,
      notebooks!notebook_collaborators_notebook_id_fkey (
        id, name, type, description, cover_color, status, visibility,
        owner_id, last_edited_by, created_at, updated_at,
        profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url),
        notebook_collaborators (id, user_id, role,
          profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
        )
      )
    `)
    .eq('user_id', userId)
    .order('invited_at', { ascending: false })

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  const sharedNotebooks = (shared ?? [])
    .filter((s: any) => s.notebooks)
    .map((s: any) => ({ ...s.notebooks, _shared_as: s.role }))

  return NextResponse.json({
    owned:  owned ?? [],
    shared: sharedNotebooks,
  })
}

// POST /api/notebooks — create a notebook
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase  = serviceClient()
  const userId    = session.user.id
  const body      = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const type = body.type ?? 'general'
  let name   = body.name?.trim()

  // Auto-name general notebooks
  if (type === 'general' && !name) {
    const { data: existing } = await supabase
      .from('notebooks')
      .select('name')
      .eq('owner_id', userId)
      .eq('type', 'general')
      .ilike('name', 'General Notebook %')

    const usedNumbers = (existing ?? [])
      .map((n: any) => parseInt(n.name.replace('General Notebook ', ''), 10))
      .filter((n: number) => !isNaN(n))

    const next = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1
    name = `General Notebook ${next}`
  }

  if (!name) return NextResponse.json({ error: 'Notebook name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('notebooks')
    .insert({
      name,
      type,
      description:   body.description   ?? null,
      cover_color:   body.cover_color    ?? '#C9A84C',
      status:        body.status         ?? 'active',
      visibility:    body.visibility     ?? 'private',
      owner_id:      userId,
      last_edited_by: userId,
    })
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('notebook_activity_log').insert({
    notebook_id: data.id,
    user_id:     userId,
    action:      'created',
    metadata:    { name: data.name, type: data.type },
  })

  return NextResponse.json(data, { status: 201 })
}
