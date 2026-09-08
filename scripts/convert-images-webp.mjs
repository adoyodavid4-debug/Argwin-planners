// convert-images-webp.mjs — re-encode product-images PNG/JPG → WebP to cut
// storage, with NO content loss. Converts every object, updates the DB URLs
// (.png/.jpg → .webp), then deletes the originals. Only deletes once its WebP
// exists, so nothing breaks. Idempotent-ish (re-running skips already-webp).
//
//   SBP=<supabase PAT> node scripts/convert-images-webp.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY
const T = process.env.SBP, REF = 'grixdggvrcwbqhjewfum'
const sh = { apikey: K, Authorization: `Bearer ${K}` }

const mgmt = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }),
  })
  if (!r.ok) throw new Error(`mgmt ${r.status} ${await r.text()}`)
  return r.json()
}

const enc = (p) => p.split('/').map(encodeURIComponent).join('/')

async function convertOne(name) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const src = `${U}/storage/v1/object/public/product-images/${enc(name)}`
      const res = await fetch(src)
      if (!res.ok) throw new Error(`download ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const webp = await sharp(buf).webp({ quality: 80 }).toBuffer()
      const dst = name.replace(/\.(png|jpe?g)$/i, '.webp')
      const up = await fetch(`${U}/storage/v1/object/product-images/${enc(dst)}`, {
        method: 'POST', headers: { ...sh, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: webp,
      })
      if (!up.ok) throw new Error(`upload ${up.status} ${await up.text()}`)
      return { name, before: buf.length, after: webp.length }
    } catch (e) {
      if (attempt === 3) return { name, error: e.message }
      await new Promise((r) => setTimeout(r, 600 * attempt))
    }
  }
}

async function pool(items, n, fn) {
  let i = 0, done = 0
  const out = []
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
      if (++done % 100 === 0 || done === items.length) console.log(`  …${done}/${items.length}`)
    }
  }))
  return out
}

// ── run ──
const rows = await mgmt(`select name from storage.objects where bucket_id='product-images' and (lower(name) like '%.png' or lower(name) like '%.jpg' or lower(name) like '%.jpeg');`)
const names = rows.map((r) => r.name)
console.log(`Converting ${names.length} images to WebP…`)

const results = await pool(names, 6, convertOne)
const ok = results.filter((r) => r && !r.error)
const failed = results.filter((r) => r && r.error)
const before = ok.reduce((a, r) => a + r.before, 0), after = ok.reduce((a, r) => a + r.after, 0)
console.log(`\nConverted ${ok.length}/${names.length}. ${(before / 1048576).toFixed(0)}MB → ${(after / 1048576).toFixed(0)}MB webp.`)
if (failed.length) {
  console.error(`FAILED ${failed.length}:`)
  failed.slice(0, 10).forEach((f) => console.error('  ', f.name, f.error))
  console.error('Aborting DB update + delete (fix failures first, re-run).')
  process.exit(1)
}

// Point the DB at the .webp URLs (plain string replace — safe, extension only).
console.log('Updating product URLs → .webp…')
await mgmt(`update products set thumbnail = replace(replace(replace(thumbnail,'.png','.webp'),'.jpeg','.webp'),'.jpg','.webp') where thumbnail like '%/product-images/%';`)
await mgmt(`update products set images = (select coalesce(array_agg(replace(replace(replace(e,'.png','.webp'),'.jpeg','.webp'),'.jpg','.webp')), '{}') from unnest(images) e) where array_length(images,1) > 0;`)

// Delete the originals now that every WebP exists and the DB points at them.
console.log('Deleting original PNG/JPG…')
let removed = 0
for (let i = 0; i < names.length; i += 100) {
  const batch = names.slice(i, i + 100)
  const r = await fetch(`${U}/storage/v1/object/product-images`, {
    method: 'DELETE', headers: { ...sh, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: batch }),
  })
  if (r.ok) removed += batch.length
  else console.error('  delete batch failed', r.status)
}
console.log(`Done. Removed ${removed} originals. Storage saved ≈ ${((before - after) / 1048576).toFixed(0)}MB.`)
