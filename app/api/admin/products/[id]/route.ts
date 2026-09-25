import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin()
  if (denied) return denied
  const supabase = getClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// Fields copied straight through from the JSON body when present.
const JSON_ALLOWED = [
  'title', 'slug', 'status', 'price', 'compare_price', 'is_featured', 'is_bestseller',
  'is_new', 'description', 'product_type', 'fulfillment_options', 'delivery_type',
  'category_id', 'file_formats', 'page_count', 'display_order', 'meta_title',
  'meta_description', 'images', 'thumbnail', 'is_bundle', 'bundle_items',
]

// JSON-only. Handles both the quick edits from the products table / pricing page
// and the full edit from the edit form. Media is uploaded to Storage from the
// browser (signed upload URLs), so this only ever receives URLs/paths — never
// binaries — and can't hit Vercel's 4.5 MB request-body limit.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin()
  if (denied) return denied
  const supabase = getClient()

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  for (const key of JSON_ALLOWED) {
    if (key in body) patch[key] = body[key]
  }

  if (typeof patch.title === 'string') patch.title = patch.title.trim()

  // Normalise a couple of fields that arrive in more than one shape.
  if ('images' in body && Array.isArray(body.images)) {
    patch.images = body.images.map(String).filter(Boolean)
  }
  if ('bundle_items' in body) {
    patch.bundle_items = Array.isArray(body.bundle_items) && body.bundle_items.length
      ? body.bundle_items.map(String).filter(Boolean)
      : null
  }

  // Tags may arrive as an array (full edit) or a comma string (legacy quick edit).
  if ('tags' in body) {
    patch.tags = Array.isArray(body.tags)
      ? body.tags.map(String).map((t: string) => t.trim()).filter(Boolean)
      : (typeof body.tags === 'string' ? body.tags.split(',').map((t) => t.trim()).filter(Boolean) : [])
  }

  // Category can be sent by slug (full edit) — resolve it to an id.
  if ('category_slug' in body) {
    const cs = body.category_slug ? String(body.category_slug) : ''
    if (cs) {
      const { data: cat } = await supabase.from('categories').select('id').eq('slug', cs).single()
      patch.category_id = cat?.id ?? null
    } else {
      patch.category_id = null
    }
  }

  // Planner files (full edit): store the map and derive the legacy single-file
  // columns the download route falls back to.
  if ('planner_files' in body) {
    const pf = (body.planner_files && typeof body.planner_files === 'object') ? body.planner_files : {}
    patch.planner_files = pf
    const primary = pf.a4 ?? pf.a5 ?? pf.us_letter ?? null
    patch.file_url     = primary?.url ?? null
    patch.file_size_mb = primary?.size_mb ?? null
  }

  // Stamp published_at only on the FIRST activation.
  if (patch.status === 'active') {
    const { data: cur } = await supabase.from('products').select('published_at').eq('id', params.id).single()
    if (!cur?.published_at) patch.published_at = new Date().toISOString()
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin()
  if (denied) return denied
  const supabase = getClient()
  const { error } = await supabase.from('products').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
