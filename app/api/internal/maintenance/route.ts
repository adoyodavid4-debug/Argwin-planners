// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// (1) Creates the MADE TO LAST. product line (business-planners).
// (2) Restores posts 5 & 6 to reference MADE TO LAST. / THE COUNT.
// (3) Re-dates the 10 recently-added posts so the curated posts stay on top.
// Guarded by the SHA-256 of a random 384-bit token.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = 'a5fdfbc12609883f4e009a1577db62b2ecb2397a1d61fb8c8952df6594af1dc0'
const BUSINESS_CAT = '54dc820a-18ed-4f2f-96e3-2d28b8980812'
const IMG = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80`

const PRODUCTS = [
  {
    title: 'MADE TO LAST.', slug: 'made-to-last',
    description: 'MADE TO LAST. — a set of three linked digital planners for the solo creative turning craft into income: GROUNDWORK., THE LONG YEAR. and THE COUNT. Three books, one business, and a structure designed to last. Hyperlinked for GoodNotes and Notability, in A4, A5 and US Letter.',
    category_id: BUSINESS_CAT, status: 'active', delivery_type: 'digital', price: 44.99, compare_price: 56.97, currency: 'USD',
    images: [IMG('photo-1452860606245-08befc0ff44b')], thumbnail: IMG('photo-1452860606245-08befc0ff44b'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], tags: ['business', 'creative', 'set', 'made to last'],
    product_type: 'planner', fulfillment_options: 'digital', is_new: true,
    meta_title: 'MADE TO LAST. — Planner Set for Solo Creatives',
    meta_description: 'A three-book set for turning a craft into income: foundations, an undated operating year, and the money.',
    published_at: '2026-09-25T10:00:00Z',
  },
  {
    title: 'GROUNDWORK.', slug: 'groundwork',
    description: 'GROUNDWORK. — the foundations book from the MADE TO LAST. set. Get clear on what you make and for whom, what makes yours different, your pricing, and your why. A calm, hyperlinked digital planner for GoodNotes and Notability, in A4, A5 and US Letter.',
    category_id: BUSINESS_CAT, status: 'active', delivery_type: 'digital', price: 18.99, compare_price: 32.99, currency: 'USD',
    images: [IMG('photo-1497032628192-86f99bcd76bc')], thumbnail: IMG('photo-1497032628192-86f99bcd76bc'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], tags: ['business', 'creative', 'foundations', 'made to last'],
    product_type: 'planner', fulfillment_options: 'digital', is_new: true,
    meta_title: 'GROUNDWORK. — Creative Business Foundations Planner',
    meta_description: 'The foundations: your offer, your customer, your pricing and your why.',
    published_at: '2026-09-25T10:00:00Z',
  },
  {
    title: 'THE LONG YEAR.', slug: 'the-long-year',
    description: 'THE LONG YEAR. — the operating-year book from the MADE TO LAST. set. An undated twelve-month rhythm so you can start the day you are ready, not on 1 January: weekly and monthly routines, launches and reviews. Hyperlinked for GoodNotes and Notability, in A4, A5 and US Letter.',
    category_id: BUSINESS_CAT, status: 'active', delivery_type: 'digital', price: 18.99, compare_price: 32.99, currency: 'USD',
    images: [IMG('photo-1506784983877-45594efa4cbe')], thumbnail: IMG('photo-1506784983877-45594efa4cbe'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], tags: ['business', 'creative', 'undated', 'made to last'],
    product_type: 'planner', fulfillment_options: 'digital', is_new: true,
    meta_title: 'THE LONG YEAR. — Undated Operating Year for Creatives',
    meta_description: 'An undated twelve-month operating year, so you can start the day you are ready.',
    published_at: '2026-09-25T10:00:00Z',
  },
  {
    title: 'THE COUNT.', slug: 'the-count',
    description: 'THE COUNT. — the money book from the MADE TO LAST. set. Income and expense ledgers, profit and loss, pricing and tax set-asides in full depth, so you can see your whole financial picture in one calm place. Hyperlinked for GoodNotes and Notability, in A4, A5 and US Letter.',
    category_id: BUSINESS_CAT, status: 'active', delivery_type: 'digital', price: 18.99, compare_price: 32.99, currency: 'USD',
    images: [IMG('photo-1554224154-26032ffc0d07')], thumbnail: IMG('photo-1554224154-26032ffc0d07'),
    file_formats: ['PDF', 'GoodNotes', 'Notability'], tags: ['business', 'creative', 'finance', 'tax', 'made to last'],
    product_type: 'planner', fulfillment_options: 'digital', is_new: true,
    meta_title: 'THE COUNT. — Money & Tax Planner for Solo Creatives',
    meta_description: 'Ledgers, profit and loss, pricing and tax set-asides in one hyperlinked place.',
    published_at: '2026-09-25T10:00:00Z',
  },
]

// Restored product sections for posts 5 & 6 (the paragraph range that changes).
const POST5_OLD = `## Planners for the creative business

Our business collection is built for exactly this journey — turning a craft into income without losing the love along the way:

- **SHOW UP.** — for building the consistent rhythm of making, listing and posting
- **PAID.** — for tracking pitches, deliverables and payments as the work comes in
- **WHAT WORKS.** — for reading your numbers and doing more of what sells

Each is a hyperlinked digital planner for GoodNotes and Notability, designed to feel warm rather than clinical.

## Your next step

Write one sentence: *"I make ___ for ___."* If you can't fill it in yet, that's your month-one work.

When you're ready to build the whole year, **[explore the business planners](/shop/category/business-planners)**.`

const POST5_NEW = `## Introducing MADE TO LAST.

We built **MADE TO LAST.** for exactly this journey: a set of three linked digital planners for the solo creative turning craft into income.

- **GROUNDWORK.** — the foundations: your offer, your customer, your pricing, your why
- **THE LONG YEAR.** — an undated twelve-month operating year, so you can start the day you're ready, not on 1 January
- **THE COUNT.** — the money: ledgers, profit and loss, pricing and tax set-asides, in full depth

Three books, one business, and a structure designed to last.

## Your next step

Write one sentence: *"I make ___ for ___."* If you can't fill it in yet, that's your month-one work.

When you're ready to build the whole year, **[explore MADE TO LAST.](/shop/made-to-last)**.`

const POST6_OLD = `## Built for this: the budget & finance planners

Give your numbers a proper home. Our budget planners bring income and expense tracking, savings goals and a tax set-aside together into one calm, hyperlinked place, so you can see your whole financial picture at a glance and always know what's yours and what's the taxman's.

## Your next step

Pick your percentage today, even if it's a rough one. Then, the next time you're paid, move that amount before you do anything else.

When you want a proper home for your numbers, **[explore the budget planners](/shop/category/budget-planners)**.`

const POST6_NEW = `## Built for this: THE COUNT.

**THE COUNT.** is the money book in our MADE TO LAST. set for solo creatives. It brings together income and expense ledgers, profit and loss, pricing and tax set-asides in one hyperlinked digital planner, so you can see your whole financial picture in one calm place.

## Your next step

Pick your percentage today, even if it's a rough one. Then, the next time you're paid, move that amount before you do anything else.

When you want a proper home for your numbers, **[explore THE COUNT.](/shop/the-count)**.`

// New publish dates — all below the four curated posts (21–25 Sep), above the legacy 2025 posts.
const DATES: Record<string, string> = {
  'how-to-set-up-digital-planner-goodnotes': '2026-09-20T12:00:00Z',
  'adhd-friendly-planning-what-works': '2026-09-19T12:00:00Z',
  'spoon-theory-planning-low-energy-week': '2026-09-18T12:00:00Z',
  'simple-budget-system-ipad': '2026-09-17T12:00:00Z',
  'hobby-to-income-plan-solo-creatives': '2026-09-16T12:00:00Z',
  'how-much-set-aside-tax-freelancer': '2026-09-15T12:00:00Z',
  'brand-deals-track-pitches-rates-payments-ugc': '2026-09-14T12:00:00Z',
  'social-media-metrics-that-matter': '2026-09-13T12:00:00Z',
  'digital-vs-paper-planners-honest-comparison': '2026-09-12T12:00:00Z',
  'digital-planner-size-a5-a4-us-letter': '2026-09-11T12:00:00Z',
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-maint-token') ?? ''
  const presented = createHash('sha256').update(token).digest()
  const expected = Buffer.from(TOKEN_SHA256, 'hex')
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const out: Record<string, unknown> = {}

  // 1. Create MADE TO LAST. products
  const { data: prods, error: pErr } = await db.from('products').upsert(PRODUCTS, { onConflict: 'slug' }).select('slug, status')
  out.products = pErr ? `error:${pErr.message}` : (prods ?? []).map((p) => p.slug)

  // 2. Restore posts 5 & 6 copy
  for (const [slug, oldS, newS] of [
    ['hobby-to-income-plan-solo-creatives', POST5_OLD, POST5_NEW],
    ['how-much-set-aside-tax-freelancer', POST6_OLD, POST6_NEW],
  ] as const) {
    const { data: row } = await db.from('blog_posts').select('id, body').eq('slug', slug).single()
    if (!row?.body) { out[slug] = 'not-found'; continue }
    if (!row.body.includes(oldS)) { out[slug] = row.body.includes(newS) ? 'already-restored' : 'anchor-missing'; continue }
    const { error } = await db.from('blog_posts').update({ body: row.body.replace(oldS, newS) }).eq('id', row.id)
    out[slug] = error ? `error:${error.message}` : 'restored'
  }

  // 3. Re-date the 10 recent posts
  const dated: string[] = []
  for (const [slug, at] of Object.entries(DATES)) {
    const { error } = await db.from('blog_posts').update({ published_at: at }).eq('slug', slug)
    if (!error) dated.push(slug)
  }
  out.redated = dated.length

  return NextResponse.json({ ok: true, ...out })
}
