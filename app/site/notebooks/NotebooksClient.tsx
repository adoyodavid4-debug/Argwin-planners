'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  Notebook, NotebookPen, BookOpen, Sparkles, Zap, Smartphone, Download, RefreshCcw,
  Layers, Shield, Check, ArrowRight, ChevronRight, ChevronDown, Star, Quote, BadgeCheck,
  PenLine, Briefcase, GraduationCap, Heart, ListChecks, Palette, Tablet, Printer,
  Wand2, CreditCard, Clock,
} from 'lucide-react'
import { OptInForm } from '@/components/funnel/OptInForm'

const COVERS = [
  { name: 'Lavender', hex: '#B8A9D4' },
  { name: 'Blush',    hex: '#E8C5C0', dark: true },
  { name: 'Sage',     hex: '#A8B5A0' },
  { name: 'Gold',     hex: '#A0830E' },
  { name: 'Charcoal', hex: '#2C2A35' },
  { name: 'Cream',    hex: '#F2E9D8', dark: true },
]

// ── colour helpers ────────────────────────────────────────────
const clamp = (n: number) => Math.max(0, Math.min(255, n))
function shade(hex: string, amt: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  const f = (c: number) => clamp(Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))).toString(16).padStart(2, '0')
  return `#${f(r)}${f(g)}${f(b)}`
}

interface NotebookItem {
  id: string; title: string; slug: string; description: string | null
  price: number | null; currency: string | null; images: string[] | null
  fulfillment_options?: string | null
}

// ════════════════════════════════════════════════════════════
//  Interactive 3D notebook preview (cursor-tilt + colour pick)
// ════════════════════════════════════════════════════════════
function NotebookPreview({ hex, dark }: { hex: string; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [16, -16]), { stiffness: 180, damping: 18 })
  const ry = useSpring(useTransform(mx, [0, 1], [-30, -6]), { stiffness: 180, damping: 18 })
  const txt = dark ? '#2C2A35' : '#ffffff'

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return
    mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height)
  }
  const reset = () => { mx.set(0.5); my.set(0.5) }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className="flex items-center justify-center" style={{ perspective: 1200 }}>
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}>
        <div style={{ position: 'relative', width: 236, height: 306, transformStyle: 'preserve-3d' }}>
          {/* page stack (right edge thickness) */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '6px 14px 14px 6px',
            boxShadow: '3px 0 0 #efe9dc, 6px 1px 0 #e4ddca, 9px 2px 0 #efe9dc, 12px 3px 0 #e4ddca, 15px 4px 0 #efe9dc' }} />
          {/* cover */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '6px 14px 14px 6px', overflow: 'hidden',
            background: `linear-gradient(135deg, ${shade(hex, 0.18)} 0%, ${hex} 55%, ${shade(hex, -0.12)} 100%)`,
            boxShadow: '0 34px 60px rgba(44,42,53,0.32)' }}>
            {/* spine */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, background: shade(hex, -0.22), boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.28)' }} />
            {/* deboss frame */}
            <div style={{ position: 'absolute', inset: '20px 22px 20px 32px', border: `1.5px solid ${dark ? 'rgba(44,42,53,0.25)' : 'rgba(255,255,255,0.45)'}`, borderRadius: 7, transform: 'translateZ(8px)' }} />
            {/* logo + title */}
            <div style={{ position: 'absolute', left: 8, right: 0, top: '38%', textAlign: 'center', transform: 'translateZ(16px)' }}>
              <div style={{ width: 34, height: 34, margin: '0 auto 12px', borderRadius: '50%', border: `1.5px solid ${txt}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} color={txt} />
              </div>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: 24, lineHeight: 1, color: txt, fontWeight: 600 }}>Arwign</p>
              <p style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: txt, opacity: 0.85, marginTop: 6 }}>Notebook</p>
            </div>
            {/* elastic band */}
            <div style={{ position: 'absolute', right: 30, top: -4, bottom: -4, width: 11, background: 'rgba(0,0,0,0.16)', transform: 'translateZ(2px)' }} />
            {/* sheen */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, transparent 38%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── product card ──────────────────────────────────────────────
function NotebookCard({ p, index }: { p: NotebookItem; index: number }) {
  const [loaded, setLoaded] = useState(false)
  const img = p.images?.[0]
  const price = p.price != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency ?? 'USD' }).format(p.price)
    : 'Free'
  return (
    <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4) }} className="group">
      <Link href={`/shop/${p.slug}`} className="block rounded-2xl overflow-hidden border tile-hover h-full" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
          {!loaded && img && <div className="absolute inset-0 skeleton" />}
          {img ? (
            <Image src={img} alt={p.title} fill onLoad={() => setLoaded(true)}
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              className={`object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><Notebook size={40} style={{ color: 'var(--text-muted)' }} /></div>
          )}
          {p.fulfillment_options === 'both' && <span className="badge badge-gold absolute top-3 right-3">Also in print</span>}
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--charcoal)' }}>View notebook <ArrowRight size={13} /></span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-semibold text-base mb-1 line-clamp-2 transition-colors group-hover:text-gold" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
          {p.description && <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>}
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{price}</span>
        </div>
      </Link>
    </motion.div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-4 p-4 text-left">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <ChevronDown size={16} className="flex-shrink-0 transition-transform duration-300" style={{ color: 'var(--gold)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function NotebooksClient({ notebooks, faqs }: { notebooks: NotebookItem[]; faqs: { q: string; a: string }[] }) {
  const [cover, setCover] = useState(0)
  const c = COVERS[cover]

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative w-full pt-12 pb-16 border-b overflow-hidden bg-gradient-mesh" style={{ borderColor: 'var(--border)' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute rounded-full blur-3xl opacity-30 animate-float" style={{ width: 320, height: 320, top: -110, right: '4%', background: '#E5DFD5' }} />
          <div className="absolute rounded-full blur-3xl opacity-25 animate-float-delayed" style={{ width: 240, height: 240, bottom: -80, left: '0%', background: 'var(--gold)' }} />
        </div>

        <div className="container-site relative grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Copy */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <nav className="flex items-center gap-1.5 mb-5 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
              <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
              <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>Digital Notebooks</span>
            </nav>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-4 px-3 py-1.5 rounded-full"
              style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.14)', letterSpacing: '0.12em' }}>
              <Notebook size={12} /> Digital Notebooks
            </p>
            <h1 className="font-display mb-4" style={{ fontSize: 'clamp(2.3rem,5.5vw,3.8rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}>
              Capture the chaos.<br /><span style={{ color: 'var(--gold)' }}>Find the clarity.</span>
            </h1>
            <p className="text-sm leading-relaxed max-w-md mb-7" style={{ color: 'var(--text-secondary)' }}>
              Structured, hyperlinked notebooks for bullet journaling, project planning, study notes and creative writing — instant download, GoodNotes &amp; Notability ready, or print at home.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-7">
              <Link href="#notebooks" className="btn-primary">Browse Notebooks <ArrowRight size={15} /></Link>
              <Link href="/notebooks/personalized" className="btn-outline">Create Your Own</Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[{ icon: Zap, l: 'Instant download' }, { icon: Smartphone, l: 'GoodNotes & Notability' }, { icon: RefreshCcw, l: 'Lifetime access' }].map(({ icon: Icon, l }) => (
                <span key={l} className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Icon size={14} style={{ color: 'var(--gold)' }} /> {l}</span>
              ))}
            </div>
          </motion.div>

          {/* Interactive cover designer */}
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.15 }} className="relative">
            <div className="relative h-[340px] sm:h-[380px]">
              <NotebookPreview hex={c.hex} dark={c.dark} />
            </div>
            <div className="mt-2 flex flex-col items-center gap-3">
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                <Palette size={12} className="inline mb-0.5 mr-1" style={{ color: 'var(--gold)' }} /> Pick a cover · {c.name}
              </p>
              <div className="flex items-center gap-2.5">
                {COVERS.map((cv, i) => (
                  <button key={cv.name} onClick={() => setCover(i)} aria-label={cv.name}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                    style={{ background: cv.hex, border: '2px solid var(--bg-card)', boxShadow: cover === i ? `0 0 0 2px ${cv.hex}` : '0 1px 4px rgba(0,0,0,0.18)', outline: cover === i ? '2px solid var(--gold)' : 'none', outlineOffset: 2 }} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ TRUST STRIP ═══════════════════════════════════════ */}
      <section className="border-b py-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="container-site flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {[{ icon: Zap, l: 'Instant Delivery' }, { icon: Shield, l: 'Secure Checkout' }, { icon: Smartphone, l: 'Any Device' }, { icon: Printer, l: 'Print or Digital' }, { icon: CreditCard, l: 'Card · PayPal · M-Pesa' }].map(({ icon: Icon, l }) => (
            <span key={l} className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Icon size={15} style={{ color: 'var(--gold)' }} /> {l}</span>
          ))}
        </div>
      </section>

      {/* ══ TWO WAYS TO GET YOURS ═════════════════════════════ */}
      <section className="container-site py-16">
        <div className="text-center mb-10 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Two Ways to Get Yours</p>
          <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Ready-Made or Made for You</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { href: '/notebooks/general', icon: BookOpen, title: 'Ready-Made Notebooks', body: 'Shop our curated library of beautifully designed notebooks — download and start within minutes.', cta: 'Browse the library', accent: 'var(--lavender)' },
            { href: '/notebooks/personalized', icon: Wand2, title: 'Personalized Notebooks', body: 'Have a specific layout, theme or niche in mind? Tell us your idea and our team designs it around you.', cta: 'Request a custom design', accent: 'var(--gold)' },
          ].map(({ href, icon: Icon, title, body, cta, accent }) => (
            <Link key={href} href={href} className="group relative p-7 rounded-3xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-product-hover" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div aria-hidden className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-50 transition-opacity duration-300 group-hover:opacity-80" style={{ background: accent }} />
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={26} style={{ color: 'var(--gold)' }} /></div>
              <h3 className="relative font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="relative text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--gold)' }}>{cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ══ NOTEBOOK GRID ═════════════════════════════════════ */}
      <section id="notebooks" className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', scrollMarginTop: 100 }}>
        <div className="container-site">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>The Library</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Featured Notebooks</h2>
          </div>

          {notebooks.length === 0 ? (
            <div className="max-w-lg mx-auto text-center p-10 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><NotebookPen size={28} style={{ color: 'var(--gold)' }} /></div>
              <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Fresh notebooks are on the way</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Our designers are putting the finishing touches on the collection. Join the list to be first in line — or request a custom one today.</p>
              <div className="mb-5"><OptInForm variant="footer" locale="en" /></div>
              <Link href="/notebooks/personalized" className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: 'var(--gold)' }}>Request a custom notebook <ArrowRight size={14} /></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {notebooks.map((p, i) => <NotebookCard key={p.id} p={p} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ══ WHAT'S INSIDE ═════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="text-center mb-12 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Thoughtful by Design</p>
            <h2 className="font-display text-display-sm mb-3" style={{ color: 'var(--text-primary)' }}>What&rsquo;s Inside Every Notebook</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Crafted detail by detail so your ideas have a beautiful place to live.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Layers, title: 'Hyperlinked Tabs', body: 'Jump between sections, indexes and pages with a single tap — no scrolling.' },
              { icon: Download, title: 'Every File Format', body: 'High-resolution PDF plus GoodNotes & Notability ready files in one download.' },
              { icon: Notebook, title: 'A4 · US Letter · A5', body: 'Three sizes included so it fits your tablet or printer perfectly.' },
              { icon: Palette, title: 'Designer Templates', body: 'Dot-grid, lined, blank and structured layouts in elegant, calm themes.' },
              { icon: RefreshCcw, title: 'Reusable Forever', body: 'Duplicate pages infinitely in your app — never run out of space.' },
              { icon: BadgeCheck, title: 'Free Updates', body: 'Buy once and re-download improved versions from your account, free.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={20} style={{ color: 'var(--gold)' }} /></div>
                <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PERFECT FOR ═══════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>One Notebook, Endless Uses</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Perfect For…</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: PenLine, t: 'Bullet Journaling', d: 'Rapid logging, trackers and collections.' },
              { icon: Briefcase, t: 'Project Planning', d: 'Briefs, milestones and meeting notes.' },
              { icon: GraduationCap, t: 'Study Notes', d: 'Cornell layouts, summaries and revision.' },
              { icon: Heart, t: 'Journaling', d: 'Gratitude, reflection and daily pages.' },
              { icon: ListChecks, t: 'To-Do & Tasks', d: 'Checklists that never run out of room.' },
              { icon: Sparkles, t: 'Creative Writing', d: 'Story outlines, ideas and free-writing.' },
            ].map(({ icon: Icon, t, d }, i) => (
              <motion.div key={t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex items-start gap-3.5 p-5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={18} style={{ color: 'var(--gold)' }} /></div>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{t}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Simple as 1·2·3</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>From Cart to First Page in Minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Notebook, title: 'Choose Your Notebook', body: 'Pick a ready-made design or request a custom one built around your needs.' },
              { icon: Download, title: 'Download Instantly', body: 'Files arrive by email and in your account the moment payment clears.' },
              { icon: Tablet, title: 'Import & Begin', body: 'Open in GoodNotes or print at home and start filling the pages.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.12 }} className="text-center flex flex-col items-center">
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-card)', border: '2px solid var(--gold)' }}>
                  <Icon size={24} style={{ color: 'var(--gold)' }} />
                  <span className="absolute -top-2 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--gold)' }}>{i + 1}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DEVICE SHOWCASE ═══════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--charcoal)' }}>
        <div className="container-site grid lg:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold-light)', letterSpacing: '0.12em' }}>Use It Anywhere</p>
            <h2 className="font-display text-display-sm mb-4" style={{ color: '#fff' }}>Beautiful on Screen. Stunning in Print.</h2>
            <p className="text-sm leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.7)' }}>Annotate on your iPad, type on your laptop, or print and bind at home. Your notebooks go wherever your ideas do — no subscriptions, no lock-in.</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ icon: Tablet, l: 'iPad & GoodNotes' }, { icon: Smartphone, l: 'Notability' }, { icon: BookOpen, l: 'Xodo & PDF' }, { icon: Printer, l: 'Print at Home' }].map(({ icon: Icon, l }) => (
                <div key={l} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}><Icon size={18} style={{ color: 'var(--gold-light)' }} /><span className="text-sm font-medium" style={{ color: '#fff' }}>{l}</span></div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-2 gap-4">
            {[{ n: '3', l: 'Sizes Included' }, { n: '4.9★', l: 'Avg Rating' }, { n: '100%', l: 'Instant Access' }, { n: '∞', l: 'Reusable Pages' }].map((s) => (
              <div key={s.l} className="text-center py-7 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-display text-3xl font-semibold mb-1" style={{ color: 'var(--gold-light)' }}>{s.n}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />)}
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>4.9 out of 5</span>
            </div>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Loved by Note-Takers Everywhere</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Lena M.', grad: 'linear-gradient(135deg,#B8A9D4,#7B6FAE)', text: 'The hyperlinks are a game-changer — my whole study system finally lives in one tidy notebook.' },
              { name: 'Tomas R.', grad: 'linear-gradient(135deg,#A0830E,#C4A538)', text: 'Imported into GoodNotes in seconds and the layouts are gorgeous. Easily my favourite purchase this year.' },
              { name: 'Aisha B.', grad: 'linear-gradient(135deg,#E8C5C0,#C9847C)', text: 'I asked for a custom journal and they nailed it. It feels like it was made just for me — because it was.' },
            ].map((r, i) => (
              <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.1 }}
                className="p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <Quote size={26} style={{ color: 'var(--gold)', opacity: 0.4 }} className="mb-3" />
                <div className="flex gap-0.5 mb-3">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={13} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />)}</div>
                <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>&ldquo;{r.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: r.grad }}>{r.name.charAt(0)}</div>
                  <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p><p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> Verified Purchase</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Good to Know</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Frequently Asked</h2>
          </div>
          <div className="flex flex-col gap-3">{faqs.map((f, i) => <FaqItem key={i} {...f} />)}</div>
        </div>
      </section>

      {/* ══ PERSONALIZED CTA ══════════════════════════════════ */}
      <section className="border-t py-16 newsletter-gradient" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}><Wand2 size={26} style={{ color: 'var(--gold)' }} /></div>
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Can&rsquo;t Find It?</p>
          <h2 className="font-display text-display-sm mb-4" style={{ color: 'var(--text-primary)' }}>We&rsquo;ll Design It Just for You</h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>Tell us the layout, theme or niche you have in mind and our design team will craft a notebook around exactly what you need.</p>
          <Link href="/notebooks/personalized" className="btn-primary">Start Your Custom Notebook <ArrowRight size={15} /></Link>
        </div>
      </section>

    </div>
  )
}
