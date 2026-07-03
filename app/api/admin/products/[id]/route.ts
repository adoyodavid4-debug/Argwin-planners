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
    .from('products')
    .select('*, categories(id, name, slug)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// Fields allowed in the simple JSON quick-edit path (used by the products table)
const JSON_ALLOWED = [
  'title', 'slug', 'status', 'price', 'compare_price', 'is_featured', 'is_bestseller',
  'is_new', 'description', 'tags', 'product_type', 'fulfillment_options', 'delivery_type',
  'category_id', 'file_formats', 'page_count', 'display_order', 'meta_title',
  'meta_description', 'images', 'thumbnail',
]

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const contentType = req.headers.get('content-type') ?? ''

  // ── Multipart path — full edit incl. image/file uploads ─────────────────
  if (contentType.includes('multipart/form-data')) {
    try {
      const form = await req.formData()

      const { data: current, error: curErr } = await supabase
        .from('products')
        .select('slug, images, thumbnail, planner_files, status, published_at')
        .eq('id', params.id)
        .single()
      if (curErr || !current) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

      const patch: Record<string, unknown> = {}
      const text = (key: string) => {
        const v = form.get(key)
        return v === null ? null : String(v)
      }

      const title = text('title')
      if (title !== null) patch.title = title.trim()
      const slug = text('slug')
      if (slug !== null) patch.slug = slug.trim() || slugify(String(title ?? current.slug))
      const description = text('description')
      if (description !== null) patch.description = description

      if (form.has('category_slug')) {
        const categorySlug = String(form.get('category_slug'))
        if (categorySlug) {
          const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single()
          patch.category_id = cat?.id ?? null
        } else {
          patch.category_id = null
        }
      }

      if (form.has('price'))          patch.price = parseFloat(String(form.get('price')))
      if (form.has('compare_price'))  patch.compare_price = String(form.get('compare_price')) ? parseFloat(String(form.get('compare_price'))) : null
      if (form.has('status'))         patch.status = String(form.get('status'))
      if (form.has('delivery_type'))       patch.delivery_type = String(form.get('delivery_type'))
      if (form.has('product_type'))        patch.product_type = String(form.get('product_type'))
      if (form.has('fulfillment_options')) patch.fulfillment_options = String(form.get('fulfillment_options'))
      if (form.has('file_formats'))   patch.file_formats = form.getAll('file_formats').map(String).filter(Boolean)
      if (form.has('page_count'))     patch.page_count = String(form.get('page_count')) ? parseInt(String(form.get('page_count'))) : null
      if (form.has('display_order'))  patch.display_order = String(form.get('display_order')) ? parseInt(String(form.get('display_order'))) : null
      if (form.has('is_featured'))    patch.is_featured   = form.get('is_featured') === 'true'
      if (form.has('is_bestseller'))  patch.is_bestseller = form.get('is_bestseller') === 'true'
      if (form.has('is_new'))         patch.is_new        = form.get('is_new') === 'true'
      if (form.has('tags')) {
        const tagsRaw = String(form.get('tags'))
        patch.tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
      }
      if (form.has('meta_title'))       patch.meta_title = String(form.get('meta_title'))
      if (form.has('meta_description')) patch.meta_description = String(form.get('meta_description'))

      const storageSlug = (patch.slug as string) || current.slug

      // Images: existing (kept, ordered) + newly uploaded appended
      if (form.has('existing_images') || form.getAll('images').length > 0) {
        let keptImages: string[] = Array.isArray(current.images) ? current.images : []
        const existingRaw = form.get('existing_images')
        if (existingRaw !== null) {
          try { keptImages = JSON.parse(String(existingRaw)) } catch { /* keep current */ }
        }

        const newUrls: string[] = []
        const imageFiles = form.getAll('images') as File[]
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i]
          if (!file || file.size === 0) continue
          const ext  = file.name.split('.').pop() ?? 'jpg'
          const path = `${storageSlug}/image-${Date.now()}-${i}.${ext}`
          const buffer = Buffer.from(await file.arrayBuffer())
          const { error } = await supabase.storage
            .from('product-images')
            .upload(path, buffer, { contentType: file.type, upsert: true })
          if (!error) {
            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
            newUrls.push(publicUrl)
          }
        }

        const images = [...keptImages, ...newUrls]
        patch.images = images
        patch.thumbnail = images[0] ?? null
      }

      // Per-size planner files: replace uploads and explicit removals
      const PLANNER_SIZES: { key: string; slugSuffix: string }[] = [
        { key: 'a4',        slugSuffix: 'a4' },
        { key: 'a5',        slugSuffix: 'a5' },
        { key: 'us_letter', slugSuffix: 'us-letter' },
      ]
      const plannerFiles: Record<string, { url: string; size_mb: number; name: string }> =
        { ...((current.planner_files as Record<string, { url: string; size_mb: number; name: string }>) ?? {}) }
      let plannerChanged = false

      for (const { key, slugSuffix } of PLANNER_SIZES) {
        if (form.get(`remove_file_${key}`) === 'true') {
          delete plannerFiles[key]
          plannerChanged = true
        }
        const file = form.get(`file_${key}`) as File | null
        if (file && file.size > 0) {
          const ext    = file.name.split('.').pop() ?? 'pdf'
          const path   = `${storageSlug}/planner-${slugSuffix}.${ext}`
          const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2))
          const buffer = Buffer.from(await file.arrayBuffer())
          const { error } = await supabase.storage
            .from('product-files')
            .upload(path, buffer, { contentType: file.type, upsert: true })
          if (!error) {
            plannerFiles[key] = { url: path, size_mb: sizeMb, name: file.name }
            plannerChanged = true
          }
        }
      }

      if (plannerChanged) {
        patch.planner_files = plannerFiles
        const primary = plannerFiles.a4 ?? plannerFiles.a5 ?? plannerFiles.us_letter ?? null
        patch.file_url     = primary?.url ?? null
        patch.file_size_mb = primary?.size_mb ?? null
      }

      if (patch.status === 'active' && !current.published_at) {
        patch.published_at = new Date().toISOString()
      }
      patch.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('products')
        .update(patch)
        .eq('id', params.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ product: data })
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  }

  // ── JSON path — quick edits from the products table ─────────────────────
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  for (const key of JSON_ALLOWED) {
    if (key in body) patch[key] = body[key]
  }
  if (body.status === 'active' && !body.published_at) patch.published_at = new Date().toISOString()
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('products').update(patch).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getClient()
  const { error } = await supabase.from('products').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
