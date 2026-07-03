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

export async function GET() {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getClient()

  try {
    const form = await req.formData()

    const name = (form.get('name') as string)?.trim()
    const slug = (form.get('slug') as string)?.trim() || slugify(name ?? '')
    const icon = (form.get('icon') as string)?.trim() || null
    const description = (form.get('description') as string) || null
    const sortOrder  = form.get('sort_order') ? parseInt(form.get('sort_order') as string) : 0
    const isFeatured = form.get('is_featured') === 'true'

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    // Upload category image to the public `site-assets` bucket
    let imageUrl: string | null = null
    const imageFile = form.get('image') as File | null
    if (imageFile && imageFile.size > 0) {
      const ext  = imageFile.name.split('.').pop() ?? 'jpg'
      const path = `categories/${slug}-${Date.now()}.${ext}`
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const { error } = await supabase.storage
        .from('site-assets')
        .upload(path, buffer, { contentType: imageFile.type, upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(path)
        imageUrl = publicUrl
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        icon,
        description,
        image_url:   imageUrl,
        sort_order:  sortOrder,
        is_featured: isFeatured,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
