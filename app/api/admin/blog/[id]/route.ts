import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const contentType = req.headers.get('content-type') ?? ''

  try {
    const { data: current, error: curErr } = await supabase
      .from('blog_posts')
      .select('slug, status, published_at')
      .eq('id', params.id)
      .single()
    if (curErr || !current) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const patch: Record<string, unknown> = {}

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()

      if (form.has('title'))   patch.title = String(form.get('title')).trim()
      if (form.has('slug'))    patch.slug  = String(form.get('slug')).trim() || slugify(String(patch.title ?? current.slug))
      if (form.has('excerpt')) patch.excerpt = String(form.get('excerpt'))
      if (form.has('body'))    patch.body = String(form.get('body'))
      if (form.has('category')) patch.category = String(form.get('category')) || null
      if (form.has('status'))  patch.status = String(form.get('status'))
      if (form.has('read_time_mins')) {
        patch.read_time_mins = String(form.get('read_time_mins')) ? parseInt(String(form.get('read_time_mins'))) : null
      }
      if (form.has('tags')) {
        const tagsRaw = String(form.get('tags'))
        patch.tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
      }
      if (form.get('remove_cover') === 'true') patch.cover_image = null

      const coverFile = form.get('cover_image') as File | null
      if (coverFile && coverFile.size > 0) {
        const storageSlug = (patch.slug as string) || current.slug
        const ext  = coverFile.name.split('.').pop() ?? 'jpg'
        const path = `${storageSlug}/cover-${Date.now()}.${ext}`
        const buffer = Buffer.from(await coverFile.arrayBuffer())
        const { error } = await supabase.storage
          .from('blog-images')
          .upload(path, buffer, { contentType: coverFile.type, upsert: true })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path)
          patch.cover_image = publicUrl
        }
      }
    } else {
      const body = await req.json().catch(() => null)
      if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
      const allowed = ['title', 'slug', 'excerpt', 'body', 'cover_image', 'category', 'tags', 'read_time_mins', 'status']
      for (const key of allowed) {
        if (key in body) patch[key] = body[key]
      }
    }

    if (patch.status === 'published' && !current.published_at) {
      patch.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(patch)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ post: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
