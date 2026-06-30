// One-off script: uploads the four real planner PDFs to the private
// `product-files` storage bucket and inserts them as active products in the
// correct categories, all priced at $17.99.
//
//   Student Planners   → Masters Student Planner (GoodNotes)
//   Wellness Planners  → Inner Weather Wellness Planner
//   Habit Trackers     → 66-Day Habit Tracker (Wellness Premium) + v2
//
// Run once from the arwign-planners directory:  node scripts/seed-real-planners.mjs
// Idempotent: product rows use ignore-duplicates on slug, uploads use upsert.
import { readFileSync } from 'node:fs'

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

// ── The four real planners (PDFs live in the parent "Arwign Planners" folder) ──
// Absolute paths so the script works regardless of cwd.
const PROJECT_ROOT = 'C:/Users/Adoyo Odhiambo/OneDrive/Projects/Arwign Planners'

const PLANNERS = [
  {
    title: 'Masters Student Planner — GoodNotes',
    slug: 'masters-student-planner-goodnotes',
    category: 'student-planners',
    description:
      'A focused digital planner for postgraduate and university students. Built for GoodNotes with semester overview, assignment and deadline trackers, lecture notes pages, reading logs and weekly study schedules to keep your degree on track.',
    file: `${PROJECT_ROOT}/Students Planner/Masters_Student_Planner_GoodNotes.pdf`,
    file_formats: ['PDF', 'GoodNotes'],
    page_count: 33,
    tags: ['student', 'masters', 'academic', 'university', 'goodnotes', 'study'],
    is_featured: true,
  },
  {
    title: 'Inner Weather Wellness Planner',
    slug: 'inner-weather-wellness-planner',
    category: 'wellness-planners',
    description:
      'A gentle wellness planner for checking in with your "inner weather." Daily mood and energy check-ins, gratitude prompts, reflection spreads and self-care rituals to help you notice patterns and tend to your wellbeing.',
    file: `${PROJECT_ROOT}/Students Planner/Inner_Weather_Wellness_Planner.pdf`,
    file_formats: ['PDF', 'GoodNotes', 'Notability'],
    page_count: 20,
    tags: ['wellness', 'self-care', 'mood', 'mental health', 'gratitude', 'mindfulness'],
    is_featured: true,
  },
  {
    title: '66-Day Habit Tracker — Wellness Premium',
    slug: '66-day-habit-tracker-wellness-premium',
    category: 'habit-trackers',
    description:
      'A premium 66-day habit tracker designed around wellness routines. Research-backed 66-day format with daily check-ins, weekly reflections and progress charts to help you build habits that stick.',
    file: `${PROJECT_ROOT}/66Day_HabitTracker_Wellness_Premium.pdf`,
    file_formats: ['PDF'],
    page_count: 19,
    tags: ['habit tracker', '66 days', 'wellness', 'routine', 'premium', 'goals'],
    is_featured: false,
  },
  {
    title: '66-Day Habit Tracker (v2)',
    slug: '66-day-habit-tracker-v2',
    category: 'habit-trackers',
    description:
      'The streamlined v2 of our 66-day habit tracker. A clean, printable layout with daily check-ins and weekly reflections to lock in a new habit over the science-backed 66-day window.',
    file: `${PROJECT_ROOT}/66_Day_Habit_Tracker_v2.pdf`,
    file_formats: ['PDF'],
    page_count: 19,
    tags: ['habit tracker', '66 days', 'printable', 'routine', 'goals'],
    is_featured: false,
  },
]

// Themed cover placeholders (consistent with the rest of the catalogue — swap
// for real covers later via the admin product editor).
const COVER = {
  'student-planners': 'photo-1501504905252-473c47e087f8',
  'wellness-planners': 'photo-1545205597-3d9d02c29597',
  'habit-trackers': 'photo-1484480974693-6ca0a78fb36b',
}

async function getCategoryIds(slugs) {
  const res = await fetch(`${URL_}/rest/v1/categories?select=id,slug&slug=in.(${slugs.join(',')})`, { headers })
  const rows = await res.json()
  const map = Object.fromEntries(rows.map((r) => [r.slug, r.id]))
  for (const s of slugs) if (!map[s]) throw new Error(`Missing category for slug: ${s}`)
  return map
}

async function ensureBucket(name) {
  const res = await fetch(`${URL_}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: name, name, public: false }),
  })
  if (res.ok) {
    console.log(`created bucket ${name}`)
    return
  }
  const body = await res.text()
  if (res.status === 409 || body.includes('already exists') || body.includes('Duplicate')) {
    console.log(`bucket ${name} already exists`)
    return
  }
  throw new Error(`Create bucket ${name} failed: ${res.status} ${body}`)
}

async function uploadFile(path, buffer) {
  const res = await fetch(`${URL_}/storage/v1/object/product-files/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
    body: buffer,
  })
  if (!res.ok) throw new Error(`Upload ${path} failed: ${res.status} ${await res.text()}`)
  console.log(`uploaded ${path}`)
}

async function insertProducts(rows) {
  const res = await fetch(`${URL_}/rest/v1/products`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`INSERT failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  console.log(`inserted ${data.length} product(s):`, data.map((d) => d.slug))
}

await ensureBucket('product-files')
const catIds = await getCategoryIds(['student-planners', 'wellness-planners', 'habit-trackers'])
const now = new Date().toISOString()

const rows = []
for (const p of PLANNERS) {
  const buffer = readFileSync(p.file)
  const sizeMb = parseFloat((buffer.length / (1024 * 1024)).toFixed(2))
  const storagePath = `${p.slug}/planner-a4.pdf` // primary file (matches admin upload convention)

  await uploadFile(storagePath, buffer)

  rows.push({
    title: p.title,
    slug: p.slug,
    description: p.description,
    category_id: catIds[p.category],
    status: 'active',
    delivery_type: 'digital',
    product_type: 'planner',
    fulfillment_options: 'digital',
    price: 17.99,
    compare_price: null,
    currency: 'USD',
    thumbnail: `https://images.unsplash.com/${COVER[p.category]}?w=600&q=80`,
    images: [`https://images.unsplash.com/${COVER[p.category]}?w=800&q=80`],
    preview_pages: [],
    file_url: storagePath,
    file_size_mb: sizeMb,
    file_formats: p.file_formats,
    page_count: p.page_count,
    is_featured: p.is_featured,
    is_bestseller: false,
    is_new: true,
    is_bundle: false,
    tags: p.tags,
    meta_title: p.title,
    meta_description: p.description.slice(0, 160),
    published_at: now,
  })
}

await insertProducts(rows)
console.log('done — 4 planners seeded at $17.99')
