// One-off script: adds the 12 new "Undated Digital Monthly Planner" designs
// (Planner 16–27, the "New Designs" series) to the live Digital Planners category.
//
// For each design it:
//   • uploads the source PDF   → private  product-files/<slug>/planner-a4.pdf
//   • uploads hero + 5 marketing PNGs → public product-images/<slug>/<name>.png
//   • inserts an ACTIVE product row in the `digital-planners` category at $9.99,
//     flagged is_new + is_featured, with a rich-HTML description.
//
// Run once from the arwign-planners directory:
//   node scripts/seed-new-digital-planners.mjs
// Idempotent: product rows use ignore-duplicates on slug; uploads use upsert.
import { readFileSync, existsSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

// The "New Designs" folder holds both the source PDFs and one image folder per planner.
const DESIGNS = 'C:/Users/Adoyo Odhiambo/OneDrive/Documents/Projects/Arwign Planners/Planners and Notebooks/New Designs'

// Marketing image files present in every "Planner NN - Name" folder.
const IMAGE_FILES = ['hero.png', '02_whats-inside.png', '03_features.png', '04_device.png', '05_navigation.png', '06_how-it-works.png']

// ── The 12 new designs (mirrors THEMES in New Designs/_make_marketing_sets.py) ──
const THEMES = [
  { num: 16, name: 'Contour Frost', file: 'Copy of Copy of Copy of Copy of 18. Undated Digital Monthly Planner.pdf',
    tagline: 'Calm contour lines for clear-headed planning.',
    desc: 'A frosted blue-grey background traced with delicate topographic contour lines, finished with deep teal tabs and a soft sage title badge — calm, collected and quietly striking.',
    palette: 'Frost Grey, Deep Teal, Soft Sage', mood: 'calm, focused, minimal',
    bg: 'Frost Grey', acc: 'Topographic Contour Lines', tabs: 'Deep Teal',
    tags: ['topographic planner', 'minimalist planner', 'teal planner'] },
  { num: 17, name: 'Twin Hearts', file: 'Copy of Copy of Copy of Copy of Copy of 18. Undated Digital Monthly Planner.pdf',
    tagline: 'Two hearts, one beautiful plan.',
    desc: 'A clean ivory cover with two hand-drawn entwined hearts in deep plum and elegant gold script — romantic, refined and timeless.',
    palette: 'Ivory, Deep Plum, Gold', mood: 'romantic, elegant, timeless',
    bg: 'Ivory', acc: 'Entwined Outline Hearts', tabs: 'Deep Plum',
    tags: ['heart planner', 'romantic planner', 'plum planner'] },
  { num: 18, name: 'Stone Blossom', file: 'Copy of Copy of Copy of Copy of Copy of Copy of Copy of Undated Digital Monthly Planner.pdf',
    tagline: 'Soft blossoms on quiet stone.',
    desc: 'A warm stone-grey backdrop crowned by a real cherry-blossom branch, with deep mahogany tabs and a dark title badge — serene, grounded and effortlessly graceful.',
    palette: 'Stone Grey, Dark Mahogany, Blossom White', mood: 'serene, grounded, graceful',
    bg: 'Stone Grey', acc: 'Cherry Blossom Branch', tabs: 'Dark Mahogany',
    tags: ['blossom planner', 'floral planner', 'grey planner'] },
  { num: 19, name: 'Copper Weave', file: 'Copy of Copy of Copy of Copy of Copy of Copy of Undated Digital Monthly Planner.pdf',
    tagline: 'Woven lines, warm metal, bold plans.',
    desc: 'A rich espresso cover woven with gleaming copper line-work and burnt-orange tabs — bold, luxurious and full of presence.',
    palette: 'Espresso Brown, Copper, Burnt Orange', mood: 'bold, luxurious, confident',
    bg: 'Espresso Brown', acc: 'Woven Copper Line-Work', tabs: 'Burnt Orange',
    tags: ['geometric planner', 'copper planner', 'dark planner'] },
  { num: 20, name: 'Ink Herringbone', file: 'Copy of Copy of Copy of Copy of Copy of Undated Digital Monthly Planner (1).pdf',
    tagline: 'Sharp lines for sharp plans.',
    desc: 'Crisp white paper patterned with fine ink-navy herringbone lines and matching navy tabs — tailored, modern and beautifully precise.',
    palette: 'Paper White, Ink Navy', mood: 'crisp, tailored, modern',
    bg: 'Paper White', acc: 'Fine Herringbone Lines', tabs: 'Ink Navy',
    tags: ['herringbone planner', 'navy planner', 'minimalist planner'] },
  { num: 21, name: 'Flutter Meadow', file: 'Copy of Copy of Copy of Copy of Copy of Undated Digital Monthly Planner.pdf',
    tagline: 'Let your plans take flight.',
    desc: 'A soft sage-grey meadow where pink butterflies drift from a single white bloom, with muted sage tabs and a forest-green badge — gentle, whimsical and fresh.',
    palette: 'Sage Grey, Forest Green, Petal Pink', mood: 'gentle, whimsical, fresh',
    bg: 'Sage Grey', acc: 'Bloom & Butterflies', tabs: 'Muted Sage',
    tags: ['butterfly planner', 'floral planner', 'sage planner'] },
  { num: 22, name: 'Blush Arrows', file: 'Copy of Copy of Copy of Copy of Undated Digital Monthly Planner.pdf',
    tagline: 'Forward is the only direction.',
    desc: 'A dusty-rose cover grounded by a striking chevron-arrow motif in raspberry, navy and ink, with raspberry tabs to match — chic, dynamic and determined.',
    palette: 'Dusty Rose, Raspberry, Ink Navy', mood: 'chic, dynamic, determined',
    bg: 'Dusty Rose', acc: 'Chevron-Arrow Motif', tabs: 'Raspberry',
    tags: ['chevron planner', 'pink planner', 'geometric planner'] },
  { num: 23, name: 'Graphite Trace', file: 'Copy of Copy of Copy of Undated Digital Monthly Planner (1).pdf',
    tagline: 'Quiet structure, strong focus.',
    desc: 'A sleek graphite-grey cover traced with subtle angular line-work, deep burgundy tabs and a soft mauve badge — professional, composed and quietly powerful.',
    palette: 'Graphite Grey, Deep Burgundy, Mauve', mood: 'sleek, professional, focused',
    bg: 'Graphite Grey', acc: 'Angular Line-Work', tabs: 'Deep Burgundy',
    tags: ['grey planner', 'minimalist planner', 'professional planner'] },
  { num: 24, name: 'Olive Arrows', file: 'Copy of Copy of Copy of Undated Digital Monthly Planner.pdf',
    tagline: 'Keep moving, keep growing.',
    desc: 'A light mist-grey cover anchored by a bold chevron-arrow motif in olive, moss and ink, with fresh green tabs — balanced, driven and full of momentum.',
    palette: 'Mist Grey, Olive Green, Ink', mood: 'fresh, driven, balanced',
    bg: 'Mist Grey', acc: 'Chevron-Arrow Motif', tabs: 'Fresh Green',
    tags: ['chevron planner', 'green planner', 'geometric planner'] },
  { num: 25, name: 'Mauve Sprig', file: 'Copy of Undated Digital Monthly Planner.pdf',
    tagline: 'Delicate details for thoughtful days.',
    desc: 'A muted mauve-taupe cover scattered with delicate dried-flower sprigs and a cream title badge — soft, vintage and tenderly beautiful.',
    palette: 'Mauve Taupe, Dried Rose, Cream', mood: 'soft, vintage, tender',
    bg: 'Mauve Taupe', acc: 'Dried-Flower Sprigs', tabs: 'Warm Taupe',
    tags: ['floral planner', 'mauve planner', 'vintage planner'] },
  { num: 26, name: 'Golden Arrows', file: 'Copy of Copy of Undated Digital Monthly Planner.pdf',
    tagline: 'Aim high, plan higher.',
    desc: 'A warm cream cover finished with a chevron-arrow motif in antique gold, navy and black, framed by golden tabs — ambitious, refined and quietly optimistic.',
    palette: 'Warm Cream, Antique Gold, Navy', mood: 'ambitious, refined, optimistic',
    bg: 'Warm Cream', acc: 'Chevron-Arrow Motif', tabs: 'Antique Gold',
    tags: ['gold planner', 'chevron planner', 'elegant planner'] },
  { num: 27, name: 'Magenta Pulse', file: 'Undated Digital Monthly Planner.pdf',
    tagline: 'Plan to the beat of your life.',
    desc: 'A cool silver-grey cover energised by a sweeping wave of magenta particles and vivid magenta tabs — vibrant, modern and impossible to miss.',
    palette: 'Silver Grey, Vivid Magenta', mood: 'energetic, vibrant, modern',
    bg: 'Silver Grey', acc: 'Particle Wave', tabs: 'Vivid Magenta',
    tags: ['pink planner', 'modern planner', 'abstract planner'] },
]

const kebab = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function descriptionHtml(t) {
  const detail = (label, val) => `<li><strong>${label}:</strong> ${esc(val)}</li>`
  return [
    `<p><em>${esc(t.tagline)}</em></p>`,
    `<p>${esc(t.desc)}</p>`,
    `<h3>What you get</h3>`,
    `<ul>`,
    `<li>12 months of undated monthly planning pages — reuse every year</li>`,
    `<li>Clickable tab navigation for every month (JAN–DEC)</li>`,
    `<li>Home button on every page for instant navigation</li>`,
    `<li>PDF format — works with GoodNotes, Notability, Noteshelf, Xodo &amp; more</li>`,
    `<li>Optimised for iPad &amp; tablet screens</li>`,
    `</ul>`,
    `<h3>Design details</h3>`,
    `<ul>`,
    detail('Palette', t.palette),
    detail('Background', t.bg),
    detail('Accent', t.acc),
    detail('Navigation tabs', t.tabs),
    detail('Mood', t.mood),
    `</ul>`,
    `<p><em>Digital download only — no physical item is shipped. For personal use only; not for resale or redistribution.</em></p>`,
  ].join('')
}

async function getCategoryId(slug) {
  const res = await fetch(`${URL_}/rest/v1/categories?select=id,slug&slug=eq.${slug}`, { headers })
  const rows = await res.json()
  if (!rows[0]) throw new Error(`Missing category for slug: ${slug}`)
  return rows[0].id
}

async function ensureBucket(name, isPublic) {
  const res = await fetch(`${URL_}/storage/v1/bucket`, {
    method: 'POST', headers,
    body: JSON.stringify({ id: name, name, public: isPublic }),
  })
  if (res.ok) { console.log(`created bucket ${name}`); return }
  const body = await res.text()
  if (res.status === 409 || body.includes('already exists') || body.includes('Duplicate')) {
    console.log(`bucket ${name} already exists`); return
  }
  throw new Error(`Create bucket ${name} failed: ${res.status} ${body}`)
}

async function upload(bucket, path, buffer, contentType) {
  const res = await fetch(`${URL_}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: buffer,
  })
  if (!res.ok) throw new Error(`Upload ${bucket}/${path} failed: ${res.status} ${await res.text()}`)
  console.log(`  uploaded ${bucket}/${path}`)
}

async function insertProducts(rows) {
  const res = await fetch(`${URL_}/rest/v1/products`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`INSERT failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  console.log(`\ninserted ${data.length} product(s):`, data.map((d) => d.slug))
}

await ensureBucket('product-files', false)
await ensureBucket('product-images', true)
const categoryId = await getCategoryId('digital-planners')
const now = new Date().toISOString()
const publicUrl = (path) => `${URL_}/storage/v1/object/public/product-images/${path}`

const rows = []
for (const t of THEMES) {
  const slug = `undated-digital-monthly-planner-${kebab(t.name)}`
  const title = `Undated Digital Monthly Planner — ${t.name} Edition`
  const folder = `${DESIGNS}/Planner ${t.num} - ${t.name}`
  const pdfPath = `${DESIGNS}/${t.file}`
  console.log(`\n${title}`)

  if (!existsSync(pdfPath)) throw new Error(`Missing PDF: ${pdfPath}`)
  for (const img of IMAGE_FILES) if (!existsSync(`${folder}/${img}`)) throw new Error(`Missing image: ${folder}/${img}`)

  // Private PDF → product-files/<slug>/planner-a4.pdf (matches admin upload convention)
  const pdfBuf = readFileSync(pdfPath)
  const storagePath = `${slug}/planner-a4.pdf`
  await upload('product-files', storagePath, pdfBuf, 'application/pdf')

  // Public marketing images → product-images/<slug>/<name>.png
  const imageUrls = []
  for (const img of IMAGE_FILES) {
    const buf = readFileSync(`${folder}/${img}`)
    const path = `${slug}/${img}`
    await upload('product-images', path, buf, 'image/png')
    imageUrls.push(publicUrl(path))
  }

  const description = descriptionHtml(t)
  rows.push({
    title,
    slug,
    description,
    category_id: categoryId,
    status: 'active',
    delivery_type: 'digital',
    product_type: 'planner',
    fulfillment_options: 'digital',
    price: 9.99,
    compare_price: null,
    currency: 'USD',
    thumbnail: imageUrls[0], // hero.png
    images: imageUrls,
    preview_pages: [],
    file_url: storagePath,
    file_size_mb: parseFloat((pdfBuf.length / (1024 * 1024)).toFixed(2)),
    file_formats: ['PDF', 'GoodNotes', 'Notability', 'Noteshelf', 'Xodo'],
    page_count: 17,
    is_featured: true,
    is_bestseller: false,
    is_new: true,
    is_bundle: false,
    tags: ['undated', 'monthly planner', 'digital planner', 'goodnotes', 'ipad', ...t.tags],
    meta_title: title,
    meta_description: t.desc.slice(0, 160),
    published_at: now,
  })
}

await insertProducts(rows)
console.log('\ndone — 12 new digital planners seeded at $9.99 (New + Featured)')
