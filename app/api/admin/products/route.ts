import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET(req: NextRequest) {
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

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const form = await req.formData()

    const title        = (form.get('title') as string)?.trim()
    const slug         = (form.get('slug') as string)?.trim() || slugify(title)
    const description  = (form.get('description') as string) ?? ''
    const categorySlug = (form.get('category_slug') as string) || null
    const price        = parseFloat(form.get('price') as string)
    const comparePrice = form.get('compare_price') ? parseFloat(form.get('compare_price') as string) : null
    const status       = (form.get('status') as string) || 'draft'
    const deliveryType        = (form.get('delivery_type') as string) || 'digital'
    const productType         = (form.get('product_type') as string) || 'planner'
    const fulfillmentOptions  = (form.get('fulfillment_options') as string) || 'digital'
    const fileFormats  = form.getAll('file_formats') as string[]
    const pageCount    = form.get('page_count') ? parseInt(form.get('page_count') as string) : null
    const isFeatured   = form.get('is_featured') === 'true'
    const isBestseller = form.get('is_bestseller') === 'true'
    const isNew        = form.get('is_new') !== 'false'
    const tagsRaw      = (form.get('tags') as string) ?? ''
    const tags         = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
    const metaTitle    = (form.get('meta_title') as string) || title
    const metaDesc     = (form.get('meta_description') as string) || description.slice(0, 160)
    const displayOrderRaw = form.get('display_order')
    const displayOrderInput = displayOrderRaw ? parseInt(displayOrderRaw as string) : null

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

    // Upload product images to `product-images` bucket
    let thumbnail: string | null = null
    const imageUrls: string[] = []
    const imageFiles = form.getAll('images') as File[]

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      if (!file || file.size === 0) continue
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${slug}/${i === 0 ? 'thumbnail' : `image-${i}`}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, buffer, { contentType: file.type, upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
        imageUrls.push(publicUrl)
        if (i === 0) thumbnail = publicUrl
      }
    }

    // Upload per-size planner files (A4 / A5 / US Letter) to the private
    // `product-files` bucket. The three files are submitted together under the
    // form keys `file_a4`, `file_a5`, `file_us_letter`.
    const PLANNER_SIZES: { key: string; slugSuffix: string }[] = [
      { key: 'a4',        slugSuffix: 'a4' },
      { key: 'a5',        slugSuffix: 'a5' },
      { key: 'us_letter', slugSuffix: 'us-letter' },
    ]
    const plannerFiles: Record<string, { url: string; size_mb: number; name: string }> = {}
    for (const { key, slugSuffix } of PLANNER_SIZES) {
      const file = form.get(`file_${key}`) as File | null
      if (!file || file.size === 0) continue
      const ext    = file.name.split('.').pop() ?? 'pdf'
      const path   = `${slug}/planner-${slugSuffix}.${ext}`
      const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2))
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error } = await supabase.storage
        .from('product-files')
        .upload(path, buffer, { contentType: file.type, upsert: true })
      if (!error) plannerFiles[key] = { url: path, size_mb: sizeMb, name: file.name }
    }

    // Keep the legacy single-file columns populated for backward compatibility,
    // preferring A4 and falling back to the first size that was uploaded.
    const primary = plannerFiles.a4 ?? plannerFiles.a5 ?? plannerFiles.us_letter ?? null
    const fileUrl    = primary?.url ?? null
    const fileSizeMb = primary?.size_mb ?? null

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
        images:           imageUrls,
        file_url:         fileUrl,
        file_size_mb:     fileSizeMb,
        planner_files:    plannerFiles,
        file_formats:     fileFormats,
        page_count:       pageCount,
        is_featured:      isFeatured,
        is_bestseller:    isBestseller,
        is_new:           isNew,
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
