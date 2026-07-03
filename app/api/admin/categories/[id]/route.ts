import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const contentType = req.headers.get('content-type') ?? ''

  try {
    const patch: Record<string, unknown> = {}

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()

      if (form.has('name'))        patch.name = String(form.get('name')).trim()
      if (form.has('slug'))        patch.slug = String(form.get('slug')).trim()
      if (form.has('icon'))        patch.icon = String(form.get('icon')).trim() || null
      if (form.has('description')) patch.description = String(form.get('description')) || null
      if (form.has('sort_order'))  patch.sort_order = parseInt(String(form.get('sort_order'))) || 0
      if (form.has('is_featured')) patch.is_featured = form.get('is_featured') === 'true'
      if (form.get('remove_image') === 'true') patch.image_url = null

      const imageFile = form.get('image') as File | null
      if (imageFile && imageFile.size > 0) {
        const slugForPath = (patch.slug as string) || params.id
        const ext  = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `categories/${slugForPath}-${Date.now()}.${ext}`
        const buffer = Buffer.from(await imageFile.arrayBuffer())
        const { error } = await supabase.storage
          .from('site-assets')
          .upload(path, buffer, { contentType: imageFile.type, upsert: true })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(path)
          patch.image_url = publicUrl
        }
      }
    } else {
      const body = await req.json().catch(() => null)
      if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
      const allowed = ['name', 'slug', 'description', 'icon', 'image_url', 'sort_order', 'is_featured']
      for (const key of allowed) {
        if (key in body) patch[key] = body[key]
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .update(patch)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()

  // Guard: refuse to delete a category that still has products
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', params.id)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Category still has ${count} product(s). Reassign them first.` },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('categories').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
