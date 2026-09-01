// Data + copy for the General (ready-made) Notebooks page.
// Page-local only — no global/shared edits.

export interface Colourway { id: string; name: string; hex: string; ink: string; spine: string }
export const COLOURWAYS: Colourway[] = [
  { id: 'cream',      name: 'Cream',      hex: '#EFE6D2', ink: '#6B5536', spine: '#E0D2B4' },
  { id: 'peach',      name: 'Peach',      hex: '#F2C6A6', ink: '#7E4A30', spine: '#E3AC85' },
  { id: 'sage',       name: 'Sage',       hex: '#A8B5A0', ink: '#33502C', spine: '#83AE73' },
  { id: 'golden',     name: 'Golden',     hex: '#A0830E', ink: '#6B4E10', spine: '#C28E1C' },
  { id: 'terracotta', name: 'Terracotta', hex: '#C97B5A', ink: '#FBEFE8', spine: '#AE6244' },
]

export interface SizeOpt { id: string; label: string; dim: string }
export const SIZES: SizeOpt[] = [
  { id: 'a4', label: 'A4',         dim: '210 × 297 mm' },
  { id: 'us', label: 'US Letter',  dim: '8.5 × 11 in' },
  { id: 'a5', label: 'A5',         dim: '148 × 210 mm' },
]

// TODO(spreads): replace with real interior renders when available.
export interface Spread { src: string; alt: string; caption: string }
export const SPREADS: Spread[] = [
  { src: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=900&q=80', alt: 'Open notebook with a weekly layout and a pen', caption: 'Hyperlinked weekly spread' },
  { src: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=900&q=80', alt: 'Dotted notebook page with neat handwriting', caption: 'Dot-grid notes page' },
  { src: 'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=900&q=80', alt: 'Tabbed planner pages fanned out', caption: 'Tabbed section navigation' },
  { src: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=900&q=80', alt: 'Monthly calendar spread in a notebook', caption: 'Monthly overview' },
  { src: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=80', alt: 'Lined journal page beside a coffee cup', caption: 'Lined journaling pages' },
]

export interface Feature { icon: string; title: string; body: string }
export const FEATURES: Feature[] = [
  { icon: 'link',     title: 'Hyperlinked Navigation', body: 'Tap any tab to jump between sections instantly — no scrolling.' },
  { icon: 'layers',   title: '200+ Pages of Depth',    body: 'Room to plan a whole year without ever running out of space.' },
  { icon: 'ruler',    title: 'Three Sizes',            body: 'A4, US Letter and A5 — sized for your device or printer.' },
  { icon: 'type',     title: 'Lora + Poppins',         body: 'Editorial serif headings paired with clean, modern body type.' },
  { icon: 'tablet',   title: 'App Compatible',         body: 'GoodNotes, Notability, Xodo and any PDF annotation app.' },
  { icon: 'zap',      title: 'Instant Download',       body: 'Files land in your inbox the moment you check out — start today.' },
]

export interface InsideItem { icon: string; title: string; body: string }
export const WHATS_INSIDE: InsideItem[] = [
  { icon: 'layout',   title: 'Cover & Dashboard', body: 'A calm cover and a quick-jump home dashboard.' },
  { icon: 'calendar', title: 'Year · Month · Week', body: 'Hyperlinked yearly, monthly and weekly views.' },
  { icon: 'grid',     title: 'Dotted · Lined · Blank', body: 'Three page styles for any kind of note.' },
  { icon: 'bookmark', title: 'Tabbed Sections', body: 'Side tabs to flick between sections in a tap.' },
  { icon: 'list',     title: 'Project & Notes', body: 'Dedicated trackers and free-form note pages.' },
  { icon: 'hash',     title: 'Index & Numbering', body: 'A linked index keeps everything findable.' },
]

// TODO(reviews): swap for real verified reviews when available.
export interface Review { name: string; text: string }
export const REVIEWS: Review[] = [
  { name: 'Lena M.',  text: 'The hyperlinks are a game-changer — my whole system finally lives in one tidy notebook.' },
  { name: 'Daniel K.', text: 'Downloaded it in seconds and set it up in GoodNotes before my coffee was ready.' },
  { name: 'Priya S.', text: 'Beautiful templates and the sage colourway is gorgeous. Exactly what I wanted.' },
]
export const RATING = 4.9
export const REVIEW_COUNT = 214

export interface Faq { q: string; a: string }
export const FAQS: Faq[] = [
  { q: 'What file formats will I receive?', a: 'A high-resolution hyperlinked PDF that works in GoodNotes, Notability, Xodo and any PDF app — plus print-ready sizing in A4, US Letter and A5.' },
  { q: 'How fast is delivery?', a: 'Instant. A secure download link is emailed to you the moment payment clears, and it stays in your account for re-download any time.' },
  { q: 'How do I import it into GoodNotes or Notability?', a: 'Open the PDF on your device and choose “Open in GoodNotes / Notability”, or import from Files — the tabs and links carry across automatically.' },
  { q: 'What is your refund policy?', a: 'Because these are instant digital downloads we generally cannot offer refunds, but if anything is wrong with your file our team will make it right within 30 days.' },
]
