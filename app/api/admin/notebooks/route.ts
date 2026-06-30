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

async function getAdminUserId(): Promise<string | null> {
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
  return session?.user.id ?? null
}

export async function GET(req: NextRequest) {
  const supabase = serviceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type   = searchParams.get('type')
  const q      = searchParams.get('q')

  let query = supabase
    .from('notebooks')
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url),
      notebook_collaborators (id)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (status) query = query.eq('status', status)
  if (type)   query = query.eq('type', type)
  if (q)      query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((n: any) => ({
    ...n,
    owner:             n.profiles,
    collaborator_count: n.notebook_collaborators?.length ?? 0,
  }))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const supabase   = serviceClient()
  const owner_id   = await getAdminUserId()
  const body       = await req.json().catch(() => null)

  if (!body)             return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!owner_id)         return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('notebooks')
    .insert({
      name:        body.name.trim(),
      type:        body.type        ?? 'general',
      description: body.description ?? null,
      cover_color: body.cover_color ?? '#C9A84C',
      status:      body.status      ?? 'active',
      visibility:  body.visibility  ?? 'private',
      owner_id,
      last_edited_by: owner_id,
    })
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Log the creation
  await supabase.from('notebook_activity_log').insert({
    notebook_id: data.id,
    user_id:     owner_id,
    action:      'created',
    metadata:    { name: data.name, type: data.type },
  })

  return NextResponse.json({ ...(data as any), owner: (data as any).profiles, collaborator_count: 0 })
}
