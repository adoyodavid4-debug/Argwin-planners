// Data + copy for the Personalised Notebooks page.
// Page-local only — no global/shared edits. Icon fields are string keys
// mapped to lucide icons inside the client components.

export interface Colourway { id: string; name: string; hex: string; ink: string; spine: string }
export const COLOURWAYS: Colourway[] = [
  { id: 'cream',      name: 'Cream',      hex: '#EFE6D2', ink: '#6B5536', spine: '#E0D2B4' },
  { id: 'peach',      name: 'Peach',      hex: '#F2C6A6', ink: '#7E4A30', spine: '#E3AC85' },
  { id: 'sage',       name: 'Sage',       hex: '#9CC38C', ink: '#33502C', spine: '#83AE73' },
  { id: 'golden',     name: 'Golden',     hex: '#E0A82C', ink: '#6B4E10', spine: '#C28E1C' },
  { id: 'terracotta', name: 'Terracotta', hex: '#C97B5A', ink: '#FBEFE8', spine: '#AE6244' },
]

export interface SizeOpt { id: string; label: string; dim: string }
export const SIZES: SizeOpt[] = [
  { id: 'a4', label: 'A4',         dim: '210 × 297 mm' },
  { id: 'us', label: 'US Letter',  dim: '8.5 × 11 in' },
  { id: 'a5', label: 'A5',         dim: '148 × 210 mm' },
]

export interface MotifOpt { id: string; label: string; icon: string; desc: string }
export const MOTIFS: MotifOpt[] = [
  { id: 'botanical', label: 'Botanical Line',   icon: 'leaf',     desc: 'Delicate pressed-leaf linework' },
  { id: 'deco',      label: 'Art Deco Arch',    icon: 'sparkles', desc: 'Symmetrical golden archways' },
  { id: 'celestial', label: 'Celestial Dot',    icon: 'moon',     desc: 'Soft moon-and-stars motif' },
  { id: 'monogram',  label: 'Minimal Monogram', icon: 'type',     desc: 'Your initials, quietly embossed' },
  { id: 'wave',      label: 'Wave Ripple',      icon: 'waves',    desc: 'Calming hand-drawn ripples' },
]

export interface TemplateOpt { id: string; label: string; desc: string }
export const TEMPLATES: TemplateOpt[] = [
  { id: 'dotted', label: 'Dotted', desc: 'Flexible dot-grid' },
  { id: 'lined',  label: 'Lined',  desc: 'Classic ruled lines' },
  { id: 'blank',  label: 'Blank',  desc: 'Open, unruled pages' },
]

export interface TabsOpt { id: string; label: string; desc: string }
export const TABS_OPTIONS: TabsOpt[] = [
  { id: 'daily',     label: 'Daily Focus',       desc: 'Day-by-day planning rhythm' },
  { id: 'weekmonth', label: 'Weekly + Monthly',  desc: 'Zoom between the week and month' },
  { id: 'project',   label: 'Projects + Notes',  desc: 'Project trackers and free notes' },
  { id: 'mix',       label: 'Custom Mix',        desc: "Tell us and we'll arrange the tabs" },
]

// TODO(spreads): replace with real interior renders when available.
export interface Spread { src: string; alt: string; caption: string }
export const SPREADS: Spread[] = [
  { src: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=900&q=80', alt: 'Open notebook with weekly layout and a pen', caption: 'Hyperlinked weekly spread' },
  { src: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=900&q=80', alt: 'Dotted notebook page with neat handwriting', caption: 'Dot-grid notes page' },
  { src: 'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=900&q=80', alt: 'Tabbed planner pages fanned out', caption: 'Tabbed section navigation' },
  { src: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=900&q=80', alt: 'Monthly calendar spread in a notebook', caption: 'Monthly overview' },
  { src: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=80', alt: 'Lined journal page with a coffee cup', caption: 'Lined journaling pages' },
]

export interface Feature { icon: string; title: string; body: string }
export const FEATURES: Feature[] = [
  { icon: 'link',       title: 'Hyperlinked Navigation', body: 'Tap any tab to jump between sections instantly — no scrolling.' },
  { icon: 'layers',     title: '200+ Pages of Depth',    body: 'Room to plan a whole year without ever running out of space.' },
  { icon: 'ruler',      title: 'Three Sizes',            body: 'A4, US Letter and A5 — sized for your device or printer.' },
  { icon: 'type',       title: 'Lora + Poppins',         body: 'Editorial serif headings paired with clean, modern body type.' },
  { icon: 'tablet',     title: 'App Compatible',         body: 'GoodNotes, Notability, Xodo and any PDF annotation app.' },
  { icon: 'sparkles',   title: 'Made to Order',          body: 'Hand-finished around your brief — never a generic template.' },
]

export interface Step { title: string; body: string }
export const STEPS: Step[] = [
  { title: 'Choose',      body: 'Pick your colourway, size, motif and templates above.' },
  { title: 'Personalise', body: 'Add your name or initials and any notes for our designers.' },
  { title: 'We build it', body: 'We hand-craft your notebook around your brief.' },
  { title: 'Delivered',   body: 'Your finished files arrive by email, ready to import.' },
]
export const TURNAROUND = '3–5 working days'

// TODO(reviews): swap for real verified reviews when available.
export interface Review { name: string; text: string }
export const REVIEWS: Review[] = [
  { name: 'Amara N.',  text: 'Exactly the layout I sketched, made beautiful. The sage cover is gorgeous.' },
  { name: 'Daniel K.', text: 'The team nailed my brief on the first try — it genuinely feels made for me.' },
  { name: 'Priya S.',  text: 'Imported into GoodNotes in seconds and the hyperlinks just work.' },
]
export const RATING = 4.9
export const REVIEW_COUNT = 128

export interface Faq { q: string; a: string }
export const FAQS: Faq[] = [
  { q: 'What file formats will I receive?', a: 'A high-resolution hyperlinked PDF that works in GoodNotes, Notability, Xodo and any PDF app — plus print-ready sizing.' },
  { q: 'How long does a personalised notebook take?', a: `Most made-to-order notebooks are delivered within ${TURNAROUND} of confirming your brief.` },
  { q: 'How do I import it into GoodNotes or Notability?', a: 'Open the PDF on your device and choose “Open in GoodNotes / Notability”, or import it from Files — the tabs and links carry across automatically.' },
  { q: 'What is your refund policy?', a: 'Because each notebook is custom-built we cannot offer refunds once design has started, but we will revise it until the brief is met.' },
]
