// ============================================================
//  seed-notebooks.mjs — seed the 20 per-theme notebook products
//
//  Uploads each theme's gallery (6 colour-shade covers + marketing) and
//  cream A4/A5/US-Letter PDFs, upserts the products into the Digital
//  Notebooks category at $17.99, and removes the old single consolidated
//  'arwign-general-notebook' product (and any other notebook not in the
//  new set). Idempotent.
//
//  Usage (from the arwign-planners directory):
//    node scripts/seed-notebooks.mjs --dry
//    node scripts/seed-notebooks.mjs
// ============================================================
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { buildNotebookProducts, PRICE_USD } from './catalog-source.mjs'

const DRY = process.argv.includes('--dry')

const CONTENT_TYPE = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}
const SIZE_SUFFIX = { a4: 'a4', a5: 'a5', us_letter: 'us-letter' }

const notebooks = buildNotebookProducts()
console.log(`Notebook products: ${notebooks.length}`)
for (const n of notebooks) {
  console.log(`  • ${n.title.padEnd(34)} sizes=${Object.keys(n.files).join('/')} imgs=${n.images.length}`)
}
if (DRY) {
  console.log('\n--dry: no network calls made.')
  process.exit(0)
}

// ── env + Supabase helpers ───────────────────────────────────
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

async function seedNotebook(p, categoryId, index) {
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
  // Cream PDFs → product-files/<slug>/planner-<size>.pdf
  const plannerFiles = {}
  for (const [key, suffix] of Object.entries(SIZE_SUFFIX)) {
    const src = p.files[key]
    if (!src) continue
    const buf = readFileSync(src)
    const path = `${p.slug}/planner-${suffix}.pdf`
    await uploadObject('product-files', path, buf, 'application/pdf')
    plannerFiles[key] = { url: path, size_mb: parseFloat((buf.length / 1048576).toFixed(2)), name: basename(src) }
  }
  const primary = plannerFiles.a4 ?? plannerFiles.a5 ?? plannerFiles.us_letter ?? null

  await upsertProduct({
    title: p.title,
    slug: p.slug,
    description: p.description,
    category_id: categoryId,
    status: 'active',
    delivery_type: 'digital',
    product_type: 'notebook',
    fulfillment_options: 'digital',
    price: PRICE_USD,
    compare_price: null,
    currency: 'USD',
    thumbnail,
    images: imageUrls,
    preview_pages: [],
    file_url: primary?.url ?? null,
    file_size_mb: primary?.size_mb ?? null,
    planner_files: plannerFiles,
    file_formats: p.formats,
    is_featured: index === 0,
    is_bestseller: false,
    is_new: true,
    is_bundle: false,
    display_order: 1000 + index, // keep notebooks grouped after planners
    tags: p.tags,
    meta_title: p.title,
    meta_description: p.description.replace(/\s+/g, ' ').slice(0, 160),
    published_at: new Date().toISOString(),
  })
}

async function removeStaleNotebooks(keepSlugs) {
  // Any product_type=notebook whose slug isn't in the new set (e.g. the old
  // consolidated 'arwign-general-notebook') gets removed / archived.
  const res = await fetch(`${URL_}/rest/v1/products?select=id,slug&product_type=eq.notebook`, { headers: authHeaders })
  const rows = await res.json()
  const stale = rows.filter((r) => !keepSlugs.has(r.slug)).map((r) => r.id)
  if (!stale.length) return console.log('  no stale notebooks to remove')
  console.log(`  removing ${stale.length} stale notebook(s): ${rows.filter((r) => !keepSlugs.has(r.slug)).map((r) => r.slug).join(', ')}`)
  const del = await fetch(`${URL_}/rest/v1/products?id=in.(${stale.join(',')})`, {
    method: 'DELETE',
    headers: { ...authHeaders, Prefer: 'return=minimal' },
  })
  if (!del.ok) {
    console.warn(`  delete failed (${del.status}); archiving instead`)
    await fetch(`${URL_}/rest/v1/products?id=in.(${stale.join(',')})`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'archived' }),
    })
  }
}

// ── run ──────────────────────────────────────────────────────
;(async () => {
  const categoryId = await getCategoryId('digital-notebooks')
  console.log('digital-notebooks category:', categoryId)
  let done = 0
  for (let i = 0; i < notebooks.length; i++) {
    await seedNotebook(notebooks[i], categoryId, i)
    done++
    console.log(`  ✓ ${notebooks[i].slug} (${done}/${notebooks.length})`)
  }
  console.log('\nRemoving old/consolidated notebook(s)…')
  await removeStaleNotebooks(new Set(notebooks.map((n) => n.slug)))
  console.log(`\nDone. Seeded ${done} notebook products.`)
})().catch((e) => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})
