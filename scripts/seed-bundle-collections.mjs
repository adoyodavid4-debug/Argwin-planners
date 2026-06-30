// One-off script: backfills bundle_items on the original 2 bundles and
// inserts the 8 new themed bundle products for the redesigned /shop/bundles page.
// Run once: node scripts/seed-bundle-collections.mjs
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

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function getIds(slugs) {
  const res = await fetch(`${URL_}/rest/v1/products?select=id,slug&slug=in.(${slugs.join(',')})`, { headers })
  const rows = await res.json()
  const map = Object.fromEntries(rows.map((r) => [r.slug, r.id]))
  for (const s of slugs) if (!map[s]) throw new Error(`Missing product for slug: ${s}`)
  return map
}

async function patch(slug, body) {
  const res = await fetch(`${URL_}/rest/v1/products?slug=eq.${slug}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${slug} failed: ${res.status} ${await res.text()}`)
  console.log(`patched ${slug}`)
}

async function insert(rows) {
  const res = await fetch(`${URL_}/rest/v1/products`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`INSERT failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  console.log(`inserted ${data.length} products:`, data.map((d) => d.slug))
}

const ids = await getIds([
  'ultimate-digital-planner-2025', '66-day-habit-tracker-printable', 'a5-printable-weekly-planner-pack',
  'academic-digital-planner-2025-2026', 'botanical-printable-planner-set', 'dark-mode-digital-planner-2025',
  'fitness-nutrition-tracker', 'minimalist-digital-planner-undated', 'monthly-budget-planner-finance-tracker',
  'monthly-habit-mood-tracker-digital', 'printable-budget-binder-a4', 'self-care-wellness-journal',
  'study-session-planner-printable',
])

const catRes = await fetch(`${URL_}/rest/v1/categories?select=id&slug=eq.planner-bundles`, { headers })
const [{ id: bundlesCategoryId }] = await catRes.json()

// ── Backfill existing bundles ─────────────────────────────────
await patch('student-life-bundle', {
  bundle_items: [ids['academic-digital-planner-2025-2026'], ids['study-session-planner-printable'], ids['66-day-habit-tracker-printable']],
})

await patch('complete-planner-bundle', {
  bundle_items: [
    ids['ultimate-digital-planner-2025'], ids['monthly-budget-planner-finance-tracker'],
    ids['self-care-wellness-journal'], ids['monthly-habit-mood-tracker-digital'],
    ids['academic-digital-planner-2025-2026'], ids['fitness-nutrition-tracker'],
  ],
})

// ── New curated bundles ────────────────────────────────────────
const base = (overrides) => ({
  category_id: bundlesCategoryId,
  status: 'active',
  delivery_type: 'bundle',
  currency: 'USD',
  preview_pages: [],
  is_bestseller: false,
  is_new: true,
  is_bundle: true,
  published_at: new Date().toISOString(),
  product_type: 'planner',
  fulfillment_options: 'digital',
  ...overrides,
})

const img = (unsplashId) => ({
  images: [`https://images.unsplash.com/${unsplashId}?w=800&q=80`],
  thumbnail: `https://images.unsplash.com/${unsplashId}?w=600&q=80`,
})

const newBundles = [
  base({
    title: 'Calm Collection — Wellness & Mindfulness Bundle',
    slug: 'calm-collection',
    description: 'A gentle trio for slowing down: a self-care & wellness journal, a daily mood tracker, and a botanical planner set for grounding rituals. Built for anyone navigating stress, anxiety, or burnout recovery who wants a calmer way to plan.',
    price: 17.99, compare_price: 26.97,
    ...img('photo-1512820790803-83ca734da794'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], file_size_mb: 16.90,
    is_featured: true,
    bundle_items: [ids['self-care-wellness-journal'], ids['monthly-habit-mood-tracker-digital'], ids['botanical-printable-planner-set']],
    tags: ['bundle', 'calm', 'wellness', 'mindfulness', 'self-care', 'anxiety-friendly'],
  }),
  base({
    title: 'New Mum Kit — Postpartum Planning Bundle',
    slug: 'new-mum-kit',
    description: 'Built for the fourth trimester: a self-care journal for recovery, a budget planner for new baby costs, and a 66-day habit tracker for rebuilding routines around feeds and sleep. A thoughtful gift for any new or expecting mum.',
    price: 18.99, compare_price: 27.97,
    ...img('photo-1545205597-3d9d02c29597'),
    file_formats: ['PDF', 'GoodNotes'], file_size_mb: 18.00,
    is_featured: true,
    bundle_items: [ids['self-care-wellness-journal'], ids['monthly-budget-planner-finance-tracker'], ids['66-day-habit-tracker-printable']],
    tags: ['bundle', 'new mum', 'postpartum', 'baby', 'self-care', 'gift'],
  }),
  base({
    title: 'Neurodivergent Set — ADHD-Friendly Planning Bundle',
    slug: 'neurodivergent-set',
    description: 'Low-clutter, undated layouts paired with simple daily habit and mood tracking — built for ADHD and neurodivergent brains that need flexible structure without overwhelm. Start any day, no pressure to catch up.',
    price: 14.99, compare_price: 21.97,
    ...img('photo-1506784983877-45594efa4cbe'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], file_size_mb: 14.90,
    is_featured: true,
    bundle_items: [ids['minimalist-digital-planner-undated'], ids['monthly-habit-mood-tracker-digital'], ids['66-day-habit-tracker-printable']],
    tags: ['bundle', 'adhd', 'neurodivergent', 'focus', 'low-clutter', 'undated'],
  }),
  base({
    title: 'Student Starter Pack — Academic Survival Bundle',
    slug: 'student-starter-pack',
    description: 'Everything to start the term strong: an academic planner spanning the full school year, a focused study-session tracker with Pomodoro sheets, and a printable weekly pack for quick daily planning.',
    price: 16.99, compare_price: 25.97,
    ...img('photo-1501504905252-473c47e087f8'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], file_size_mb: 19.30,
    is_featured: false,
    bundle_items: [ids['academic-digital-planner-2025-2026'], ids['study-session-planner-printable'], ids['a5-printable-weekly-planner-pack']],
    tags: ['bundle', 'student', 'academic', 'study', 'school'],
  }),
  base({
    title: 'Budget Reset Kit — Finance Clarity Bundle',
    slug: 'budget-reset-kit',
    description: 'A no-nonsense reset for your finances: a monthly budget & net worth tracker plus a printable budget binder with bill checklists and debt snowball worksheets.',
    price: 13.99, compare_price: 19.98,
    ...img('photo-1460925895917-afdab827c52f'),
    file_formats: ['PDF', 'GoodNotes'], file_size_mb: 13.10,
    is_featured: false,
    bundle_items: [ids['monthly-budget-planner-finance-tracker'], ids['printable-budget-binder-a4']],
    tags: ['bundle', 'budget', 'finance', 'savings', 'debt-payoff'],
  }),
  base({
    title: 'Fitness & Wellness Pack',
    slug: 'fitness-wellness-pack',
    description: 'Train your body and tend your mind: a fitness & nutrition tracker, a self-care & wellness journal, and a daily habit & mood tracker to keep you consistent on both fronts.',
    price: 18.99, compare_price: 27.97,
    ...img('photo-1571019613454-1cb2f99b2d8b'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], file_size_mb: 16.70,
    is_featured: false,
    bundle_items: [ids['fitness-nutrition-tracker'], ids['self-care-wellness-journal'], ids['monthly-habit-mood-tracker-digital']],
    tags: ['bundle', 'fitness', 'wellness', 'health', 'habit-tracking'],
  }),
  base({
    title: 'Digital Planner Trio — 3 Styles, One Price',
    slug: 'digital-planner-trio',
    description: "Can't decide on a look? Get all three signature digital planner styles — the Ultimate, Minimalist, and Dark Mode — in one bundle and switch whenever your mood does.",
    price: 24.99, compare_price: 37.97,
    ...img('photo-1531346878377-a5be20888e57'),
    file_formats: ['PDF', 'GoodNotes', 'Notability', 'Xodo'], file_size_mb: 41.70,
    is_featured: true,
    bundle_items: [ids['ultimate-digital-planner-2025'], ids['minimalist-digital-planner-undated'], ids['dark-mode-digital-planner-2025']],
    tags: ['bundle', 'digital', 'goodnotes', 'variety', 'best value'],
  }),
  base({
    title: 'Creative & Aesthetic Bundle',
    slug: 'creative-aesthetic-bundle',
    description: 'For the planner-as-self-expression crowd: a botanical printable set, an A5 printable weekly pack, and a moody Dark Mode digital planner — three distinct aesthetics, one bundle price.',
    price: 18.99, compare_price: 28.97,
    ...img('photo-1434030216411-0b793f4b4173'),
    file_formats: ['PDF', 'GoodNotes', 'Notability', 'Xodo'], file_size_mb: 24.70,
    is_featured: false,
    bundle_items: [ids['botanical-printable-planner-set'], ids['a5-printable-weekly-planner-pack'], ids['dark-mode-digital-planner-2025']],
    tags: ['bundle', 'aesthetic', 'creative', 'printable', 'digital'],
  }),
]

await insert(newBundles)
console.log('done')
