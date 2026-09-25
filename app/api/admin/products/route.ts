import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q      = searchParams.get('q')

  let query = supabase
    .from('products')
    .select('id, title, slug, status, price, currency, thumbnail, is_featured, is_bestseller, is_new, delivery_type, product_type, fulfillment_options, tags, rating_avg, rating_count, download_count, created_at, updated_at, categories(name, slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)
  if (q)      query = query.ilike('title', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Files (images + planner PDFs) are uploaded straight to Supabase Storage from
// the browser via signed upload URLs (see /api/admin/uploads + lib/admin/
// uploadFiles.ts). This handler therefore receives JSON — public image URLs and
// a planner_files map of storage paths — never the binaries, so it can never hit
// Vercel's 4.5 MB request-body limit.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const title        = String(body.title ?? '').trim()
    const slug         = String(body.slug ?? '').trim() || slugify(title)
    const description  = String(body.description ?? '')
    const categorySlug = body.category_slug ? String(body.category_slug) : null
    const price        = parseFloat(String(body.price))
    const comparePrice = body.compare_price != null && String(body.compare_price) !== ''
      ? parseFloat(String(body.compare_price)) : null
    const status              = String(body.status ?? 'draft')
    const deliveryType        = String(body.delivery_type ?? 'digital')
    const productType         = String(body.product_type ?? 'planner')
    const fulfillmentOptions  = String(body.fulfillment_options ?? 'digital')
    const fileFormats  = Array.isArray(body.file_formats) ? body.file_formats.map(String).filter(Boolean) : []
    const pageCount    = body.page_count ? parseInt(String(body.page_count)) : null
    const isFeatured   = body.is_featured === true || body.is_featured === 'true'
    const isBestseller = body.is_bestseller === true || body.is_bestseller === 'true'
    const isNew        = !(body.is_new === false || body.is_new === 'false')
    const isBundle     = body.is_bundle === true || body.is_bundle === 'true' || deliveryType === 'bundle'

    let bundleItems: string[] | null = null
    if (isBundle && Array.isArray(body.bundle_items)) {
      const arr = body.bundle_items.map(String).filter(Boolean)
      bundleItems = arr.length ? arr : null
    }

    const tags = Array.isArray(body.tags)
      ? body.tags.map(String).map((t: string) => t.trim()).filter(Boolean)
      : (typeof body.tags === 'string' ? body.tags.split(',').map((t) => t.trim()).filter(Boolean) : [])

    const metaTitle    = body.meta_title ? String(body.meta_title) : title
    const metaDesc     = body.meta_description ? String(body.meta_description) : description.slice(0, 160)
    const displayOrderInput = body.display_order ? parseInt(String(body.display_order)) : null

    // Media — already uploaded to Storage by the client
    const images    = Array.isArray(body.images) ? body.images.map(String).filter(Boolean) : []
    const thumbnail = body.thumbnail ? String(body.thumbnail) : (images[0] ?? null)
    const plannerFiles = (body.planner_files && typeof body.planner_files === 'object') ? body.planner_files : {}
    const primary   = plannerFiles.a4 ?? plannerFiles.a5 ?? plannerFiles.us_letter ?? null
    const fileUrl    = primary?.url ?? null
    const fileSizeMb = primary?.size_mb ?? null

    if (!title || isNaN(price)) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 })
    }

    // Resolve category slug → UUID
    let categoryId: string | null = null
    if (categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()
      categoryId = cat?.id ?? null
    }

    // Auto-assign display_order if not provided
    let displayOrder: number | null = displayOrderInput
    if (displayOrder == null && categoryId) {
      const { data: maxRow } = await supabase
        .from('products')
        .select('display_order')
        .eq('category_id', categoryId)
        .not('display_order', 'is', null)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()
      displayOrder = maxRow?.display_order != null ? (maxRow.display_order as number) + 1 : 1
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        title,
        slug,
        description,
        category_id:      categoryId,
        price,
        compare_price:    comparePrice,
        status,
        delivery_type:       deliveryType,
        product_type:        productType,
        fulfillment_options: fulfillmentOptions,
        thumbnail,
        images,
        file_url:         fileUrl,
        file_size_mb:     fileSizeMb,
        planner_files:    plannerFiles,
        file_formats:     fileFormats,
        page_count:       pageCount,
        is_featured:      isFeatured,
        is_bestseller:    isBestseller,
        is_new:           isNew,
        is_bundle:        isBundle,
        bundle_items:     bundleItems,
        display_order:    displayOrder,
        tags,
        meta_title:       metaTitle,
        meta_description: metaDesc,
        published_at:     status === 'active' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ product })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
