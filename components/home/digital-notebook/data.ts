// components/home/digital-notebook/data.ts
// Shared, presentational data for the homepage Digital Notebooks showcase.
// UK spelling throughout. Warm Arwign palette (cream / peach / sage / golden / terracotta).

export const SECTION_ID = 'digital-notebooks'

export const PRODUCT_TITLE = 'Arwign Digital Notebook'

// ─── Sizes (Ready-Made variant axis) ───────────────────────────
export interface NotebookSize {
  id: string
  label: string
  note: string
  /** Price in USD for this size. */
  price: number
}

export const SIZES: NotebookSize[] = [
  { id: 'a4',      label: 'A4',        note: 'Roomy spreads for iPad Pro', price: 14 },
  { id: 'letter',  label: 'US Letter', note: 'Standard US page ratio',     price: 14 },
  { id: 'a5',      label: 'A5',        note: 'Compact, great on the go',    price: 12 },
]

// ─── Cover colourways / motifs (Ready-Made variant axis) ────────
export interface Colourway {
  id: string
  label: string
  /** Swatch + cover-tint accent, drawn from the Arwign palette. */
  accent: string
}

export const COLOURWAYS: Colourway[] = [
  { id: 'cream',      label: 'Warm Cream', accent: '#EDE4D3' },
  { id: 'peach',      label: 'Soft Peach', accent: '#E8C5C0' },
  { id: 'sage',       label: 'Garden Sage', accent: '#A8B5A0' },
  { id: 'golden',     label: 'Golden Hour', accent: '#C9A84C' },
  { id: 'terracotta', label: 'Terracotta', accent: '#C47A5A' },
]

// ─── Interactive preview spreads ────────────────────────────────
// NOTE: placeholder preview imagery (Unsplash) — swap for real notebook
// spread renders when available. Domain is allow-listed in next.config.js.
export interface Spread {
  src: string
  alt: string
  caption: string
  /** Marks the cover slide, which reflects the selected colourway. */
  cover?: boolean
}

export const SPREADS: Spread[] = [
  {
    src: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=900&q=80&fit=crop&crop=entropy',
    alt: 'Digital notebook cover on an iPad',
    caption: 'Cover',
    cover: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=900&q=80&fit=crop&crop=entropy',
    alt: 'Hyperlinked contents page with section tabs',
    caption: 'Contents & tabs',
  },
  {
    src: 'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=900&q=80&fit=crop&crop=entropy',
    alt: 'Dotted-grid spread for bullet journaling',
    caption: 'Dotted spread',
  },
  {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&fit=crop&crop=entropy',
    alt: 'Weekly planning layout with lined sections',
    caption: 'Weekly layout',
  },
  {
    src: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=900&q=80&fit=crop&crop=entropy',
    alt: 'Blank notes page for free-form writing',
    caption: 'Blank notes',
  },
]

// ─── Compatibility ──────────────────────────────────────────────
export const COMPATIBILITY = ['GoodNotes', 'Notability', 'Xodo', 'PDF'] as const

// ─── Feature highlights ─────────────────────────────────────────
export interface Feature {
  /** lucide-react icon name resolved in the component. */
  icon: 'Link2' | 'Layers' | 'LayoutGrid' | 'Type' | 'Maximize'
  title: string
  desc: string
}

export const FEATURES: Feature[] = [
  { icon: 'Link2',      title: 'Hyperlinked tabs & navigation', desc: 'Jump between every section in a single tap — no scrolling.' },
  { icon: 'Layers',     title: '200+ pages',                    desc: 'A generous page count so you never run out of room.' },
  { icon: 'LayoutGrid', title: 'Dotted, lined & blank',         desc: 'Mix template styles to suit how you think and write.' },
  { icon: 'Type',       title: 'Lora + Poppins typography',     desc: 'A warm serif paired with a clean sans for easy reading.' },
  { icon: 'Maximize',   title: 'Three sizes',                   desc: 'A4, US Letter and A5 — pick what fits your device.' },
]

// ─── Hyperlinked-tabs demo sections ─────────────────────────────
export const DEMO_TABS = ['Index', 'Daily', 'Weekly', 'Habits', 'Notes'] as const

// ─── FAQ ────────────────────────────────────────────────────────
export interface Faq {
  q: string
  a: string
}

export const FAQS: Faq[] = [
  {
    q: 'What formats do I get?',
    a: 'Every notebook is a high-resolution PDF that works in GoodNotes, Notability, Xodo and any PDF reader. You can also print it at home or at a copy shop.',
  },
  {
    q: 'How do I import it into GoodNotes or Notability?',
    a: 'After checkout you receive an instant download link. In GoodNotes tap New → Import and choose the PDF; in Notability use Import → from Files. The hyperlinked tabs work straight away.',
  },
  {
    q: 'Which sizes are included?',
    a: 'You choose your size at checkout — A4, US Letter or A5. Each is laid out for that exact page ratio so nothing is cropped or stretched.',
  },
  {
    q: 'What is your refund policy?',
    a: 'Because notebooks are instant digital downloads we cannot offer refunds once the file has been downloaded. If something is not right with your file, email us and we will make it good.',
  },
]

// ─── Social proof ───────────────────────────────────────────────
// TODO(reviews): replace this placeholder array with real notebook
// reviews (e.g. pulled from Supabase) once they are available.
export interface Review {
  name: string
  rating: number
  text: string
}

export const REVIEWS_PLACEHOLDER: Review[] = [
  { name: 'Naomi A.',  rating: 5, text: 'The hyperlinked tabs make my iPad notebook feel like a proper app. Beautiful and so easy to navigate.' },
  { name: 'Daniel O.', rating: 5, text: 'Imported into GoodNotes in seconds. The dotted spreads are perfect for bullet journaling.' },
  { name: 'Priya S.',  rating: 4, text: 'Lovely warm design and great page count. I went back and ordered the A5 size too.' },
]

export const RATING_AVG = 4.8
export const RATING_COUNT = 312 // TODO(reviews): wire to real review count.

// ─── Helpers ────────────────────────────────────────────────────
export const formatPrice = (usd: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd)
