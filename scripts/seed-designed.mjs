// ============================================================
//  seed-designed.mjs — add the 26 "Designed" monthly-planner cover
//  variants as separate Digital Planners at $23.99.
//
//  Usage (from the arwign-planners directory):
//    node scripts/seed-designed.mjs --dry
//    node scripts/seed-designed.mjs
// ============================================================
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { buildDesignedProducts } from './catalog-source.mjs'

const DRY = process.argv.includes('--dry')

const CONTENT_TYPE = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

const products = buildDesignedProducts()
console.log(`Designed products: ${products.length} @ $${products[0]?.price}`)
for (const p of products) console.log(`  • ${p.slug.padEnd(42)} imgs=${p.images.length}`)
if (DRY) {
  console.log('\n--dry: no network calls made.')
  process.exit(0)
}

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Missing Supabase env in .env.local')
const authHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function uploadObject(bucket, path, buffer, contentType) {
  const url = `${URL_}/storage/v1/object/${bucket}/${path}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: buffer,
    })
    if (res.ok) return
    const body = await res.text()
    if (attempt === 3) throw new Error(`upload ${path}: ${res.status} ${body}`)
    await new Promise((r) => setTimeout(r, 500 * attempt))
  }
}
const publicUrl = (bucket, path) => `${URL_}/storage/v1/object/public/${bucket}/${path}`

async function getCategoryId(slug) {
  const res = await fetch(`${URL_}/rest/v1/categories?select=id&slug=eq.${slug}`, { headers: authHeaders })
  const rows = await res.json()
  if (!rows[0]) throw new Error(`category ${slug} not found`)
  return rows[0].id
}

async function upsertProduct(row) {
  const res = await fetch(`${URL_}/rest/v1/products?on_conflict=slug`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`upsert ${row.slug}: ${res.status} ${await res.text()}`)
}

async function seedOne(p, categoryId, index) {
  // Images → product-images/<slug>/(thumbnail|image-i).<ext>
  const imageUrls = []
  let thumbnail = null
  for (let i = 0; i < p.images.length; i++) {
    const src = p.images[i]
    const ext = extname(src).toLowerCase()
    const path = `${p.slug}/${i === 0 ? 'thumbnail' : `image-${i}`}${ext}`
    await uploadObject('product-images', path, readFileSync(src), CONTENT_TYPE[ext] || 'application/octet-stream')
    const url = publicUrl('product-images', path)
    imageUrls.push(url)
    if (i === 0) thumbnail = url
  }
  // Single PDF → product-files/<slug>/planner-a4.pdf
  const buf = readFileSync(p.files.a4)
  const filePath = `${p.slug}/planner-a4.pdf`
  await uploadObject('product-files', filePath, buf, 'application/pdf')
  const sizeMb = parseFloat((buf.length / 1048576).toFixed(2))
  const plannerFiles = { a4: { url: filePath, size_mb: sizeMb, name: basename(p.files.a4) } }

  await upsertProduct({
    title: p.title,
    slug: p.slug,
    description: p.description,
    category_id: categoryId,
    status: 'active',
    delivery_type: 'digital',
    product_type: 'planner',
    fulfillment_options: 'digital',
    price: p.price,
    compare_price: null,
    currency: 'USD',
    thumbnail,
    images: imageUrls,
    preview_pages: [],
    file_url: filePath,
    file_size_mb: sizeMb,
    planner_files: plannerFiles,
    file_formats: p.formats,
    is_featured: false,
    is_bestseller: false,
    is_new: true,
    is_bundle: false,
    display_order: 500 + index,
    tags: p.tags,
    meta_title: p.title,
    meta_description: p.description.replace(/\s+/g, ' ').slice(0, 160),
    published_at: new Date().toISOString(),
  })
}

;(async () => {
  const categoryId = await getCategoryId('digital-planners')
  console.log('digital-planners category:', categoryId)
  let done = 0
  for (let i = 0; i < products.length; i++) {
    await seedOne(products[i], categoryId, i)
    done++
    console.log(`  ✓ ${products[i].slug} (${done}/${products.length})`)
  }
  console.log(`\nDone. Seeded ${done} Designed planner products @ $23.99.`)
})().catch((e) => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})
