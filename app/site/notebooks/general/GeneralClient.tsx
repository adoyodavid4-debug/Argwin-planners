'use client'
// General Notebooks — a minimal catalog of every ready-made notebook.
// Clicking a card goes straight to its shop page. No configurator here;
// personalisation lives at /notebooks/personalized.
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Notebook, Zap, Smartphone, RefreshCcw, ArrowRight, ChevronRight, ChevronDown, Wand2,
} from 'lucide-react'
import { FAQS } from './data'

export interface CatalogItem {
  id: string
  title: string
  slug: string
  price: number | null
  currency: string | null
  image: string | null
}

function money(price: number | null, currency: string | null) {
  return price != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(price)
    : 'Free'
}

function CatalogCard({ p, index }: { p: CatalogItem; index: number }) {
  const [loaded, setLoaded] = useState(false)
  // "Arwign Notebook — Garden" → show "Garden" big, keep the series small.
  const short = p.title.includes('—') ? p.title.split('—').pop()!.trim() : p.title
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min((index % 8) * 0.05, 0.35) }} className="group">
      <Link href={`/shop/${p.slug}`} className="block h-full overflow-hidden rounded-2xl border tile-hover"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
          {!loaded && p.image && <div className="absolute inset-0 skeleton" />}
          {p.image ? (
            <Image src={p.image} alt={p.title} fill onLoad={() => setLoaded(true)}
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
              className={`object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><Notebook size={36} style={{ color: 'var(--text-muted)' }} /></div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{short}</p>
            {short !== p.title && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Arwign Notebook</p>}
          </div>
          <span className="flex-shrink-0 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</span>
        </div>
      </Link>
    </motion.div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
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

export default function GeneralClient({ items }: { items: CatalogItem[] }) {
  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HEADER ════════════════════════════════════════════ */}
      <section className="border-b py-12" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center">
          <nav className="mb-5 flex items-center justify-center gap-1.5 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} />
            <Link href="/notebooks" className="transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>Notebooks</Link>
            <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>General</span>
          </nav>
          <h1 className="font-display mb-3" style={{ fontSize: 'clamp(2rem,4.5vw,3rem)', lineHeight: 1.08, color: 'var(--text-primary)' }}>
            General Notebooks
          </h1>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Every ready-made notebook in the collection — pick a design, download instantly, start today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[{ icon: Zap, l: 'Instant download' }, { icon: Smartphone, l: 'GoodNotes & Notability' }, { icon: RefreshCcw, l: 'Lifetime access' }].map(({ icon: Icon, l }) => (
              <span key={l} className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Icon size={14} style={{ color: 'var(--gold)' }} /> {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CATALOG ═══════════════════════════════════════════ */}
      <section className="container-site py-12">
        {items.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-3xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <Notebook size={32} className="mx-auto mb-4" style={{ color: 'var(--gold)' }} />
            <h2 className="font-display mb-2 text-2xl" style={{ color: 'var(--text-primary)' }}>New notebooks are on the way</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The collection is being refreshed — check back soon or request a custom design.</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
              {items.length} designs · all instant download
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p, i) => <CatalogCard key={p.id} p={p} index={i} />)}
            </div>
          </>
        )}
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════ */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site mx-auto max-w-2xl">
          <h2 className="font-display mb-6 text-center text-display-sm" style={{ color: 'var(--text-primary)' }}>Good to Know</h2>
          <div className="flex flex-col gap-3">{FAQS.map((f, i) => <FaqItem key={i} {...f} />)}</div>
        </div>
      </section>

      {/* ══ PERSONALISED CTA ══════════════════════════════════ */}
      <section className="border-t py-12" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center">
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Wand2 size={14} className="mb-0.5 mr-1.5 inline" style={{ color: 'var(--gold)' }} />
            Want something designed just for you?
          </p>
          <Link href="/notebooks/personalized" className="btn-outline inline-flex items-center gap-1.5">
            Request a personalised notebook <ArrowRight size={14} />
          </Link>
        </div>
      </section>

    </div>
  )
}
