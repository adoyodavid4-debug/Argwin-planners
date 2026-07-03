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

export async function GET(req: NextRequest) {
  const supabase = getClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q      = searchParams.get('q')

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, category, tags, read_time_mins, view_count, status, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)
  if (q)      query = query.ilike('title', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getClient()

  try {
    const form = await req.formData()

    const title   = (form.get('title') as string)?.trim()
    const slug    = (form.get('slug') as string)?.trim() || slugify(title ?? '')
    const excerpt = (form.get('excerpt') as string) ?? ''
    const body    = (form.get('body') as string) ?? ''
    const category = (form.get('category') as string) || null
    const status   = (form.get('status') as string) || 'draft'
    const readMins = form.get('read_time_mins') ? parseInt(form.get('read_time_mins') as string) : null
    const tagsRaw  = (form.get('tags') as string) ?? ''
    const tags     = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    // Upload cover image to the public `blog-images` bucket
    let coverImage: string | null = (form.get('cover_image_url') as string) || null
    const coverFile = form.get('cover_image') as File | null
    if (coverFile && coverFile.size > 0) {
      const ext  = coverFile.name.split('.').pop() ?? 'jpg'
      const path = `${slug}/cover-${Date.now()}.${ext}`
      const buffer = Buffer.from(await coverFile.arrayBuffer())
      const { error } = await supabase.storage
        .from('blog-images')
        .upload(path, buffer, { contentType: coverFile.type, upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path)
        coverImage = publicUrl
      }
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        slug,
        excerpt,
        body,
        cover_image:    coverImage,
        category,
        tags,
        read_time_mins: readMins,
        status,
        published_at:   status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ post })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
