// ============================================================
//  seed-catalog.mjs — wipe placeholders + seed the REAL catalog
//
//  Reads the local product folders (see catalog-source.mjs), uploads
//  every product's PDFs (product-files, private) and gallery images
//  (product-images, public) to Supabase Storage using the SAME path
//  conventions as the admin product editor, then upserts product rows
//  at $17.99 USD. Finally deletes any leftover placeholder products.
//
//  Usage (from the arwign-planners directory):
//    node scripts/seed-catalog.mjs --dry     # offline: parse + report only
//    node scripts/seed-catalog.mjs           # live: upload + seed
//
//  Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
//  .env.local pointing at a REACHABLE Supabase project.
//
//  Idempotent: storage uploads upsert, product rows upsert on slug.
// ============================================================
import { readFileSync, statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import {
  buildPlannerProducts,
  buildNotebookProducts,
  buildDesignedProducts,
  PRICE_USD,
} from './catalog-source.mjs'

const DRY = process.argv.includes('--dry')

// ── env ──────────────────────────────────────────────────────
function loadEnv() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  return Object.fromEntries(
    raw
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      })
  )
}

const CONTENT_TYPE = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

// ── build catalog (offline) ──────────────────────────────────
const planners = buildPlannerProducts()
const notebooks = buildNotebookProducts()
const designed = buildDesignedProducts()
const catalog = [...planners, ...notebooks, ...designed]

// Feature the first product of each category on the homepage.
const featured = new Set()
const seenCat = new Set()
for (const p of catalog) {
  if (!seenCat.has(p.category)) {
    seenCat.add(p.category)
    featured.add(p.slug)
  }
}

function report() {
  const byCat = {}
  for (const p of catalog) byCat[p.category] = (byCat[p.category] || 0) + 1
  console.log(`\nCatalog: ${catalog.length} products (${planners.length} planners + ${notebooks.length} notebooks + ${designed.length} designed)`)
  for (const [c, n] of Object.entries(byCat)) console.log(`  ${c.padEnd(20)} ${n}`)
  const sizes = { a4: 0, a5: 0, us_letter: 0 }
  let noImg = 0
  for (const p of catalog) {
    for (const k of Object.keys(sizes)) if (p.files[k]) sizes[k]++
    if (!p.images.length) noImg++
  }
  console.log(`  sizes present → A4:${sizes.a4} A5:${sizes.a5} Letter:${sizes.us_letter}`)
  console.log(`  products with no image: ${noImg}`)
  console.log(`  featured: ${featured.size}`)
}

if (DRY) {
  report()
  console.log('\n--dry: no network calls made.')
  process.exit(0)
}

// ── live: Supabase REST + Storage helpers ────────────────────
const env = loadEnv()
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')

const authHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function ensureBucket(name, isPublic) {
  const res = await fetch(`${URL_}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: name, name, public: isPublic }),
  })
  if (res.ok) return console.log(`  bucket created: ${name}`)
  const body = await res.text()
  if (res.status === 409 || /already exists|Duplicate/i.test(body)) return console.log(`  bucket ok: ${name}`)
  throw new Error(`bucket ${name}: ${res.status} ${body}`)
}

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

function publicUrl(bucket, path) {
  return `${URL_}/storage/v1/object/public/${bucket}/${path}`
}

async function getCategoryMap() {
  const res = await fetch(`${URL_}/rest/v1/categories?select=id,slug`, { headers: authHeaders })
  if (!res.ok) throw new Error(`categories: ${res.status} ${await res.text()}`)
  return Object.fromEntries((await res.json()).map((r) => [r.slug, r.id]))
}

async function upsertProduct(row) {
  const res = await fetch(`${URL_}/rest/v1/products?on_conflict=slug`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`upsert ${row.slug}: ${res.status} ${await res.text()}`)
}

const SIZE_SUFFIX = { a4: 'a4', a5: 'a5', us_letter: 'us-letter' }

async function seedProduct(p, catMap, index) {
  const categoryId = catMap[p.category]
  if (!categoryId) throw new Error(`no category id for ${p.category} (${p.slug})`)

  // 1) Upload gallery images → product-images/<slug>/(thumbnail|image-i).<ext>
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

  // 2) Upload per-size PDFs → product-files/<slug>/planner-<size>.pdf
  const plannerFiles = {}
  for (const [key, suffix] of Object.entries(SIZE_SUFFIX)) {
    const src = p.files[key]
    if (!src) continue
    const path = `${p.slug}/planner-${suffix}.pdf`
    const buf = readFileSync(src)
    await uploadObject('product-files', path, buf, 'application/pdf')
    plannerFiles[key] = {
      url: path,
      size_mb: parseFloat((buf.length / 1048576).toFixed(2)),
      name: basename(src),
    }
  }
  const primary = plannerFiles.a4 ?? plannerFiles.a5 ?? plannerFiles.us_letter ?? null

  // 3) Upsert the product row
  const now = new Date().toISOString()
  await upsertProduct({
    title: p.title,
    slug: p.slug,
    description: p.description,
    category_id: categoryId,
    status: 'active',
    delivery_type: 'digital',
    product_type: p.product_type,
    fulfillment_options: 'digital',
    price: p.price ?? PRICE_USD,
    compare_price: null,
    currency: 'USD',
    thumbnail,
    images: imageUrls,
    preview_pages: [],
    file_url: primary?.url ?? null,
    file_size_mb: primary?.size_mb ?? null,
    planner_files: plannerFiles,
    file_formats: p.formats,
    is_featured: featured.has(p.slug),
    is_bestseller: false,
    is_new: true,
    is_bundle: false,
    display_order: index,
    tags: p.tags,
    meta_title: p.title,
    meta_description: p.description.replace(/\s+/g, ' ').slice(0, 160),
    published_at: now,
  })
}

async function deletePlaceholders(keepSlugs) {
  const res = await fetch(`${URL_}/rest/v1/products?select=id,slug`, { headers: authHeaders })
  if (!res.ok) throw new Error(`list products: ${res.status} ${await res.text()}`)
  const rows = await res.json()
  const toDelete = rows.filter((r) => !keepSlugs.has(r.slug)).map((r) => r.id)
  if (!toDelete.length) return console.log('  no placeholder products to remove')
  console.log(`  removing ${toDelete.length} placeholder product(s)…`)
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50)
    const del = await fetch(`${URL_}/rest/v1/products?id=in.(${batch.join(',')})`, {
      method: 'DELETE',
      headers: { ...authHeaders, Prefer: 'return=minimal' },
    })
    if (!del.ok) {
      const body = await del.text()
      // FK from orders/reviews → archive instead of hard delete
      console.warn(`  delete batch failed (${del.status}); archiving instead: ${body.slice(0, 120)}`)
      await fetch(`${URL_}/rest/v1/products?id=in.(${batch.join(',')})`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'archived' }),
      })
    }
  }
}

// ── simple concurrency pool ──────────────────────────────────
async function runPool(items, concurrency, worker) {
  let i = 0
  let done = 0
  const total = items.length
  const errors = []
  async function next() {
    while (i < items.length) {
      const idx = i++
      try {
        await worker(items[idx], idx)
      } catch (e) {
        errors.push({ slug: items[idx].slug, error: e.message })
        console.error(`  ✗ ${items[idx].slug}: ${e.message}`)
      }
      done++
      if (done % 10 === 0 || done === total) console.log(`  …${done}/${total}`)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next))
  return errors
}

// ── main ─────────────────────────────────────────────────────
;(async () => {
  report()
  console.log('\nConnecting to Supabase:', URL_)
  const catMap = await getCategoryMap()
  console.log('  categories found:', Object.keys(catMap).length)
  for (const p of catalog) {
    if (!catMap[p.category]) throw new Error(`Missing category "${p.category}" — run migrations first.`)
  }

  console.log('\nEnsuring storage buckets…')
  await ensureBucket('product-images', true)
  await ensureBucket('product-files', false)

  console.log('\nUploading + seeding products…')
  const errors = await runPool(catalog, 4, (p, idx) => seedProduct(p, catMap, idx))

  console.log('\nRemoving placeholder products…')
  const keep = new Set(catalog.map((p) => p.slug))
  await deletePlaceholders(keep)

  console.log(`\nDone. Seeded ${catalog.length - errors.length}/${catalog.length} products.`)
  if (errors.length) {
    console.log('Failures:')
    for (const e of errors) console.log(`  - ${e.slug}: ${e.error}`)
    process.exit(1)
  }
})().catch((e) => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})
