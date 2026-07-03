// app/api/admin/generator/[id]/route.ts
// POST  — generate the planner PDF + cover for a template and publish it as a product.
// PATCH — edit template fields (name, price, compare_price, description, is_active).
//
// Storage conventions mirror app/api/admin/products/route.ts exactly:
//   - PDFs      → private  'product-files'  bucket at `{slug}/planner-a4.pdf`
//                 (planner_files/file_url store the storage PATH, not a URL)
//   - Thumbnail → public   'product-images' bucket at `{slug}/thumbnail.png`
//                 (products.thumbnail / images[] store the PUBLIC url)

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generatePlannerDetailed, TEMPLATE_FEATURES } from '@/lib/planner-generator'
import { generateCoverPng } from '@/lib/planner-generator/cover-image'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function buildTags(name: string, templateKey: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
  return Array.from(new Set([...words, templateKey, 'planner', 'digital download']))
}

function buildDescription(templateDescription: string | null, templateKey: string): string {
  const features = TEMPLATE_FEATURES[templateKey] ?? TEMPLATE_FEATURES.daily
  const intro = (templateDescription ?? '').trim()
  return [
    intro,
    `Inside this planner:\n${features.map(f => `• ${f}`).join('\n')}`,
    'Instant digital download • A4 PDF • Undated — start any time.',
  ].filter(Boolean).join('\n\n')
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()

  try {
    // 1. Load the template
    const { data: template, error: tplError } = await supabase
      .from('planner_templates')
      .select('id, name, slug, description, template_key, accent_hex, price, compare_price, category_slug, page_count, product_id')
      .eq('id', params.id)
      .single()

    if (tplError || !template) {
      return NextResponse.json({ error: tplError?.message ?? 'Template not found' }, { status: 404 })
    }

    const slug = template.slug as string

    // 2. Generate the PDF
    const { bytes, pageCount } = await generatePlannerDetailed({
      name: template.name,
      description: template.description,
      template_key: template.template_key,
      accent_hex: template.accent_hex,
      page_count: template.page_count,
    })
    const sizeMb = parseFloat((bytes.length / (1024 * 1024)).toFixed(2))

    // 3. Upload the PDF to the private product-files bucket
    const pdfPath = `${slug}/planner-a4.pdf`
    const { error: pdfError } = await supabase.storage
      .from('product-files')
      .upload(pdfPath, Buffer.from(bytes), { contentType: 'application/pdf', upsert: true })
    if (pdfError) {
      return NextResponse.json({ error: `PDF upload failed: ${pdfError.message}` }, { status: 500 })
    }
    const plannerFiles = {
      a4: { url: pdfPath, size_mb: sizeMb, name: 'planner-a4.pdf' },
    }

    // 4. Generate + upload the cover thumbnail (public bucket)
    let thumbnail: string | null = null
    try {
      const png = await generateCoverPng({ name: template.name, accentHex: template.accent_hex })
      const thumbPath = `${slug}/thumbnail.png`
      const { error: thumbError } = await supabase.storage
        .from('product-images')
        .upload(thumbPath, png, { contentType: 'image/png', upsert: true })
      if (!thumbError) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(thumbPath)
        // Cache-bust so a regenerated cover shows up immediately
        thumbnail = `${publicUrl}?v=${Date.now()}`
      }
    } catch (coverErr) {
      // A missing cover should not block publishing the planner itself
      console.error('[generator] cover generation failed:', coverErr)
    }

    // 5. Resolve the category
    let categoryId: string | null = null
    if (template.category_slug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', template.category_slug)
        .single()
      categoryId = cat?.id ?? null
    }

    // 6. Existing product? (upsert on slug)
    const { data: existing } = await supabase
      .from('products')
      .select('id, display_order, published_at, thumbnail, images')
      .eq('slug', slug)
      .maybeSingle()

    // 7. display_order via RPC with a manual fallback
    let displayOrder: number | null = existing?.display_order ?? null
    if (displayOrder == null && categoryId) {
      const { data: rpcOrder, error: rpcError } = await supabase
        .rpc('next_product_display_order', { p_category_id: categoryId })
      if (!rpcError && typeof rpcOrder === 'number') {
        displayOrder = rpcOrder
      } else {
        const { data: maxRow } = await supabase
          .from('products')
          .select('display_order')
          .eq('category_id', categoryId)
          .not('display_order', 'is', null)
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle()
        displayOrder = maxRow?.display_order != null ? (maxRow.display_order as number) + 1 : 1
      }
    }

    const description = buildDescription(template.description, template.template_key)
    const nowIso = new Date().toISOString()
    const effectiveThumb = thumbnail ?? existing?.thumbnail ?? null

    const productPayload = {
      title: template.name,
      slug,
      description,
      category_id: categoryId,
      price: template.price,
      compare_price: template.compare_price,
      status: 'active',
      delivery_type: 'digital',
      product_type: 'planner',
      fulfillment_options: 'digital',
      currency: 'USD',
      thumbnail: effectiveThumb,
      images: effectiveThumb ? [effectiveThumb] : [],
      file_url: pdfPath,
      file_size_mb: sizeMb,
      planner_files: plannerFiles,
      file_formats: ['PDF'],
      page_count: pageCount,
      is_new: true,
      display_order: displayOrder,
      tags: buildTags(template.name, template.template_key),
      meta_title: template.name,
      meta_description: description.slice(0, 160),
      published_at: existing?.published_at ?? nowIso,
    }

    let productId: string
    if (existing) {
      const { data: updated, error: updError } = await supabase
        .from('products')
        .update(productPayload)
        .eq('id', existing.id)
        .select('id')
        .single()
      if (updError || !updated) {
        return NextResponse.json({ error: `Product update failed: ${updError?.message}` }, { status: 500 })
      }
      productId = updated.id
    } else {
      const { data: inserted, error: insError } = await supabase
        .from('products')
        .insert(productPayload)
        .select('id')
        .single()
      if (insError || !inserted) {
        return NextResponse.json({ error: `Product create failed: ${insError?.message}` }, { status: 500 })
      }
      productId = inserted.id
    }

    // 8. Mark the template as generated
    const { error: tplUpdError } = await supabase
      .from('planner_templates')
      .update({ last_generated_at: nowIso, product_id: productId })
      .eq('id', template.id)
    if (tplUpdError) console.error('[generator] template update failed:', tplUpdError.message)

    return NextResponse.json({ productId, productSlug: slug, pages: pageCount, sizeMb })
  } catch (err: any) {
    console.error('[generator] generation failed:', err)
    return NextResponse.json({ error: err?.message ?? 'Planner generation failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()

  try {
    const body = await req.json()
    const update: Record<string, unknown> = {}

    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
    if (typeof body.description === 'string') update.description = body.description
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active
    if (body.price !== undefined) {
      const price = parseFloat(String(body.price))
      if (isNaN(price) || price < 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
      update.price = price
    }
    if (body.compare_price !== undefined) {
      if (body.compare_price === null || body.compare_price === '') {
        update.compare_price = null
      } else {
        const cp = parseFloat(String(body.compare_price))
        if (isNaN(cp) || cp < 0) return NextResponse.json({ error: 'Invalid compare price' }, { status: 400 })
        update.compare_price = cp
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('planner_templates')
      .update(update)
      .eq('id', params.id)
      .select('id, name, slug, description, template_key, accent_hex, price, compare_price, category_slug, page_count, is_active, sort_order, last_generated_at, product_id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Update failed' }, { status: 500 })
  }
}
