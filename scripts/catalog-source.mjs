// ============================================================
//  Catalog source parser — Arwign Planners
//  Walks the local "Planners" tree + the General Notebook folder
//  and produces normalized product descriptors for seeding.
//
//  Pure/offline: no network. Consumed by seed-catalog.mjs.
// ============================================================
import { readdirSync, statSync, existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

// ── Source roots (absolute; the product assets live outside the app) ──
export const PLANNERS_ROOT =
  'C:/Users/Adoyo Odhiambo/OneDrive/Documents/Projects/Arwign Planners/Planners and Notebooks/Planners/Planners'
export const NOTEBOOK_ROOT =
  'C:/Users/Adoyo Odhiambo/OneDrive/Documents/Projects/Arwign Planners/Planners and Notebooks/Arwign-General-Notebook'
// The full notebook zip is extracted here — one folder per theme under
// Marketing/<Theme> (covers + colourway shades) and PDFs/<Theme> (per colour × size).
export const NOTEBOOK_THEMES_ROOT =
  'C:/Users/Adoyo Odhiambo/OneDrive/Documents/Projects/Arwign Planners/Planners and Notebooks/Arwign-General-Notebook/_themes/Arwign-General-Notebook'
// "Designed" — one undated monthly planner in ~26 cover designs. PDFs live in
// the folder root; per-design marketing lives under "Marketing Materials/<name>".
export const DESIGNED_ROOT =
  'C:/Users/Adoyo Odhiambo/OneDrive/Documents/Projects/Arwign Planners/Planners and Notebooks/Designed'
export const DESIGNED_PRICE = 23.99

export const PRICE_USD = 17.99

// Folder (category) → site category slug
const CATEGORY_MAP = {
  ADHD: 'adhd-planners',
  Budget: 'budget-planners',
  Content: 'business-planners',
  'Habit Tracker': 'habit-trackers',
  'Meal Planners': 'meal-planners',
  Students: 'student-planners',
  Wellness: 'wellness-planners',
}

// Category → default tags when a listing has none
const DEFAULT_TAGS = {
  'adhd-planners': ['adhd', 'neurodivergent', 'planner', 'focus', 'digital planner'],
  'budget-planners': ['budget', 'finance', 'money', 'savings', 'planner'],
  'business-planners': ['business', 'content', 'marketing', 'creator', 'planner'],
  'habit-trackers': ['habit tracker', 'routine', 'goals', 'consistency'],
  'meal-planners': ['meal planner', 'recipes', 'grocery', 'kitchen', 'weekly'],
  'student-planners': ['student', 'academic', 'study', 'university', 'planner'],
  'wellness-planners': ['wellness', 'self-care', 'mindfulness', 'mental health', 'planner'],
}

// Folders that are NOT products (kits, briefs, dumps, bulk re-exports)
const SKIP_DIR = new RegExp(
  [
    '^redone$',
    'design brief',
    '^marketing kits?$',
    '^to be uploaded$',
    '^additionals$',
    '^cover$',
    '^zipped$',
    'product listings all',
    '^coming aboard$',
    '^listing ', // "Listing Unclenched, Gentle Momentum, ..."
  ].join('|'),
  'i'
)

// PDFs that are not the product itself
const JUNK_PDF = /terms|licen[cs]e|start.?here|read.?me|how.?to.?import/i

const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp'])

function walk(dir, acc = { pdfs: [], imgs: [], mds: [] }) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else {
      const ext = extname(e.name).toLowerCase()
      if (ext === '.pdf') acc.pdfs.push(p)
      else if (IMG_EXT.has(ext)) acc.imgs.push(p)
      else if (ext === '.md') acc.mds.push(p)
    }
  }
  return acc
}

export function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function cleanTitle(folderName) {
  return folderName
    .replace(/[·•]\s*$/g, '') // trailing bullet artifact
    .replace(/\s+i$/i, '') // stray trailing " i"
    .replace(/\s+/g, ' ')
    .trim()
}

// Resolve the three print sizes to source PDFs. Prefers digital/hyperlinked
// variants (some products ship both a "Digital" and "Printable" copy per size).
// Returns { a4, a5, us_letter } with absolute paths (any may be undefined),
// plus `primary` (best single file, always defined when any real PDF exists).
function resolveSizes(pdfs) {
  const real = pdfs.filter((p) => !JUNK_PDF.test(basename(p)))
  if (!real.length) return null
  const pick = (re) => {
    const m = real.filter((p) => re.test(basename(p)))
    if (!m.length) return undefined
    return m.find((p) => /digital|hyperlink/i.test(basename(p))) || m[0]
  }
  const a5 = pick(/a5/i)
  const a4 = pick(/a4/i)
  const us_letter = pick(/us[-_ ]?letter|usletter|(?<![a-z])letter/i)
  const files = {}
  if (a4) files.a4 = a4
  if (a5) files.a5 = a5
  if (us_letter) files.us_letter = us_letter
  // Single-size / oddly-named products: fall back to first real PDF as A4.
  const primary = a4 || us_letter || a5 || real[0]
  if (!Object.keys(files).length) files.a4 = primary
  return { files, primary }
}

function detectFormats(pdfs) {
  const names = pdfs.map((p) => basename(p).toLowerCase()).join(' ')
  const fmts = ['PDF']
  if (/hyperlink|digital|goodnotes/.test(names)) fmts.push('GoodNotes', 'Notability')
  return fmts
}

// Order gallery images: hero/01 first, then numeric, mockups last
function orderImages(imgs) {
  const score = (p) => {
    const n = basename(p).toLowerCase()
    if (/hero|_01|\b01\b|cover/.test(n)) return 0
    const m = n.match(/(\d{2})/)
    if (m) return parseInt(m[1], 10)
    if (/mockup/.test(n)) return 90
    return 50
  }
  return [...imgs].sort((a, b) => score(a) - score(b) || basename(a).localeCompare(basename(b)))
}

function extractDescription(mdPath) {
  let text
  try {
    text = readFileSync(mdPath, 'utf8')
  } catch {
    return null
  }
  const grab = (re) => {
    const m = text.match(re)
    return m ? m[1].trim() : null
  }
  // "## Description" ... up to next "---" or "## "
  let body =
    grab(/##\s*Description\s*\n([\s\S]*?)(?:\n---|\n##\s)/i) ||
    grab(/##\s*Gumroad blurb\s*\n([\s\S]*?)(?:\n---|\n##\s)/i)
  if (!body) return null
  // light markdown → plain text
  body = body
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return body.slice(0, 1800)
}

function extractTags(mdPath) {
  let text
  try {
    text = readFileSync(mdPath, 'utf8')
  } catch {
    return null
  }
  // find the block after a "**Tags**" marker and pull backticked tokens
  const idx = text.search(/\*\*Tags\*\*/i)
  if (idx === -1) return null
  const chunk = text.slice(idx, idx + 600)
  const toks = [...chunk.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim().toLowerCase())
  const uniq = [...new Set(toks)].filter((t) => t && t.length < 40)
  return uniq.length ? uniq.slice(0, 13) : null
}

// Build all planner products from the Planners tree
export function buildPlannerProducts() {
  const products = []
  const seen = new Set()
  for (const [folder, catSlug] of Object.entries(CATEGORY_MAP)) {
    const catDir = join(PLANNERS_ROOT, folder)
    let children
    try {
      children = readdirSync(catDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const c of children) {
      if (!c.isDirectory()) continue
      if (SKIP_DIR.test(c.name)) continue
      const prodDir = join(catDir, c.name)
      const assets = walk(prodDir)
      const sizes = resolveSizes(assets.pdfs)
      if (!sizes) continue // no real product PDF → skip

      const title = cleanTitle(c.name)
      const slug = slugify(title)
      if (!slug || seen.has(slug)) continue
      seen.add(slug)

      const md = assets.mds[0] || null
      const description =
        (md && extractDescription(md)) ||
        `${title} — a beautifully designed planner from Arwign Planners. Includes hyperlinked A4, A5 and US Letter PDFs for GoodNotes, Notability and Xodo, or print at home. Undated and reusable.`
      const tags = (md && extractTags(md)) || DEFAULT_TAGS[catSlug]
      const images = orderImages(assets.imgs).slice(0, 6)

      products.push({
        title,
        slug,
        category: catSlug,
        product_type: 'planner',
        description,
        tags,
        files: sizes.files,
        primaryPdf: sizes.primary,
        images,
        formats: detectFormats(assets.pdfs),
        sourceDir: prodDir,
      })
    }
  }
  return products
}

// Colour shades every notebook cover ships in (gallery order).
const SHADE_ORDER = ['cream', 'ochre', 'forest', 'sage', 'slate', 'blush']

// Build one notebook product per theme (Marble, Kawaii, Gilded, …).
// Each product's gallery shows the cover in all six colour shades ("as they
// are"); the download is the neutral cream colour in A4/A5/US-Letter.
export function buildNotebookProducts() {
  const mktRoot = join(NOTEBOOK_THEMES_ROOT, 'Marketing')
  const pdfRoot = join(NOTEBOOK_THEMES_ROOT, 'PDFs')
  let themes
  try {
    themes = readdirSync(mktRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return []
  }

  const products = []
  for (const theme of themes.sort()) {
    const mkt = join(mktRoot, theme)
    const pdfDir = join(pdfRoot, theme)

    // Resolve the cream download in each size.
    let creamPdfs = []
    try {
      creamPdfs = readdirSync(pdfDir).filter((f) => /cream/i.test(f) && f.toLowerCase().endsWith('.pdf'))
    } catch {}
    const bySize = (re) => {
      const f = creamPdfs.find((p) => re.test(p))
      return f ? join(pdfDir, f) : undefined
    }
    const files = {}
    const a4 = bySize(/a4/i)
    const a5 = bySize(/a5/i)
    const letter = bySize(/us[-_ ]?letter|usletter|letter/i)
    if (a4) files.a4 = a4
    if (a5) files.a5 = a5
    if (letter) files.us_letter = letter
    if (!Object.keys(files).length) continue // no download → skip

    // Gallery: hero, the colourway montage, then each shade cover, then details.
    const imgs = []
    const push = (rel) => {
      const full = join(mkt, rel)
      if (existsSync(full)) imgs.push(full)
    }
    // Lead with the cover variety (colourway montage + each shade cover) so the
    // thumbnail/listing shows the covers, not the marketing hero shot.
    push('covers_colourways.png')
    for (const s of SHADE_ORDER) push(join('covers', `cover_${s}.png`))
    push('hero_cream.png')
    push('look_inside.png')
    push('sizes.png')
    push('swatches.png')

    const display = theme.replace(/[-_]+/g, ' ').trim()
    products.push({
      title: `Arwign Notebook — ${display}`,
      slug: `arwign-notebook-${slugify(display)}`,
      category: 'digital-notebooks',
      product_type: 'notebook',
      description:
        `The Arwign ${display} Notebook — a clean, versatile lined & dotted notebook in the ${display} cover design. ` +
        `Available in six calm colour shades (cream, ochre, forest, sage, slate & blush) and three sizes (A4, A5 & US Letter). ` +
        `Hyperlinked, print-ready PDFs for GoodNotes, Notability and Xodo, or print at home.`,
      tags: ['notebook', display.toLowerCase(), 'lined notebook', 'dotted notebook', 'goodnotes', 'a4', 'a5'],
      files,
      primaryPdf: files.a4 || files.a5 || files.us_letter,
      images: imgs,
      formats: ['PDF', 'GoodNotes', 'Notability'],
      sourceDir: mkt,
    })
  }
  return products
}

// Named "Designed" folders that aren't "Planner NN - …" → their root PDF.
const DESIGNED_NAMED_PDF = {
  'My Monthly Planner - Starry Night': 'MY MONTHLY PLANNER 1.pdf',
  'My Monthly Planner - Teal Spiral': 'My Monthly.pdf',
  'Plant Life - Botanical Photo': 'Plant-green Undated Monthly Planner.pdf',
}

// Build one planner product per cover design in the Designed folder.
// Interiors are the same undated monthly planner; only the cover differs.
export function buildDesignedProducts() {
  const mktRoot = join(DESIGNED_ROOT, 'Marketing Materials')
  let folders
  try {
    folders = readdirSync(mktRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return []
  }
  let rootPdfs = []
  try {
    rootPdfs = readdirSync(DESIGNED_ROOT).filter((f) => f.toLowerCase().endsWith('.pdf'))
  } catch {}

  const products = []
  const seen = new Set()
  for (const folder of folders.sort()) {
    const m = folder.match(/^Planner\s+(\d+)([A-Za-z]?)\s*-\s*(.+)$/i)
    let title, design, pdf
    if (m) {
      const [, num, suffix, name] = m
      design = name.trim()
      title = `Undated Digital Monthly Planner — ${design}`
      const n = String(parseInt(num, 10)) // folders are zero-padded (02); PDFs aren't (2.)
      const cands = rootPdfs.filter((f) => new RegExp(`^${n}\\. `).test(f))
      const dup = cands.find((f) => /\(1\)/.test(f))
      const base = cands.find((f) => !/\(1\)/.test(f))
      pdf = suffix ? dup || base : base // "16B" → the (1) duplicate
    } else {
      design = folder.replace(/\s*-\s*/, ' — ')
      title = design
      pdf = DESIGNED_NAMED_PDF[folder]
    }
    if (!pdf) continue // couldn't map a PDF → skip

    const slug = slugify(m ? `undated-monthly-planner-${design}` : folder)
    if (seen.has(slug)) continue
    seen.add(slug)

    const fdir = join(mktRoot, folder)
    let imgFiles = []
    try {
      imgFiles = readdirSync(fdir).filter((f) => IMG_EXT.has(extname(f).toLowerCase()))
    } catch {}
    const images = orderImages(imgFiles.map((f) => join(fdir, f))).slice(0, 6)

    products.push({
      title,
      slug,
      category: 'digital-planners',
      product_type: 'planner',
      price: DESIGNED_PRICE,
      description:
        `The Undated Digital Monthly Planner — ${design} edition. A fully hyperlinked monthly planner with clickable ` +
        `month-navigation tabs, a monthly overview spread, weekly layouts and notes & goals sections (about 17 pages per ` +
        `monthly cycle). Undated — use any month, any year, forever. Delivered as a PDF for GoodNotes, Notability, ` +
        `Noteshelf and Xodo on iPad, Android or Surface tablets.`,
      tags: ['digital planner', 'undated', 'monthly planner', 'goodnotes', 'notability', 'ipad', design.toLowerCase()],
      files: { a4: join(DESIGNED_ROOT, pdf) },
      primaryPdf: join(DESIGNED_ROOT, pdf),
      images,
      formats: ['PDF', 'GoodNotes', 'Notability'],
      sourceDir: fdir,
    })
  }
  return products
}
