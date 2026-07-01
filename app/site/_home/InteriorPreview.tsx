'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Link2, Layers, RefreshCcw, ArrowRight } from 'lucide-react'

// TODO(spreads): replace with real interior renders when available.
const SPREADS = [
  { src: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000&q=80', alt: 'Open planner with a weekly layout and pen', caption: 'Hyperlinked weekly spread' },
  { src: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=1000&q=80', alt: 'Monthly calendar spread in a planner', caption: 'Monthly overview' },
  { src: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=1000&q=80', alt: 'Dotted notebook page with handwriting', caption: 'Dot-grid notes' },
  { src: 'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=1000&q=80', alt: 'Tabbed planner pages fanned out', caption: 'Tabbed navigation' },
  { src: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1000&q=80', alt: 'Lined journal page beside a coffee cup', caption: 'Lined journaling' },
]

export default function InteriorPreview() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})
  const n = SPREADS.length
  const go = (d: number) => setI((p) => (p + d + n) % n)

  return (
    <section className="py-16 lg:py-20 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }} aria-label="Interior preview">
      <div className="container-site grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>See inside</p>
          <h2 className="font-display mb-4" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}>Designed to be a joy to use</h2>
          <p className="text-sm leading-relaxed mb-7 max-w-md" style={{ color: 'var(--text-secondary)' }}>Tap between hyperlinked tabs, choose dotted, lined or blank pages, and plan across three sizes — every spread crafted with care.</p>
          <div className="flex flex-col gap-3 mb-8">
            {[{ icon: Link2, t: 'Hyperlinked tabs', d: 'Jump between sections in a single tap.' }, { icon: Layers, t: 'Template variety', d: 'Dotted, lined and blank layouts included.' }, { icon: RefreshCcw, t: 'Undated & reusable', d: 'Start any day, reuse year after year.' }].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={16} style={{ color: 'var(--gold)' }} /></div>
                <div><p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d}</p></div>
              </div>
            ))}
          </div>
          <Link href="/shop" className="btn-primary">Explore the collection <ArrowRight size={15} /></Link>
        </div>

        <div>
          <div className="relative rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', aspectRatio: '16/11' }}
            role="group" aria-roledescription="carousel" aria-label="Interior spreads" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) } if (e.key === 'ArrowRight') { e.preventDefault(); go(1) } }}>
            {!loaded[i] && <div className="absolute inset-0 skeleton" />}
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35 }} className="absolute inset-0">
                <Image src={SPREADS[i].src} alt={SPREADS[i].alt} fill loading="lazy" sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" onLoad={() => setLoaded((m) => ({ ...m, [i]: true }))} />
                <div className="absolute inset-x-0 bottom-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}><p className="text-sm font-medium text-white">{SPREADS[i].caption}</p></div>
              </motion.div>
            </AnimatePresence>
            <button onClick={() => go(-1)} aria-label="Previous spread" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}><ChevronLeft size={18} style={{ color: 'var(--charcoal)' }} /></button>
            <button onClick={() => go(1)} aria-label="Next spread" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}><ChevronRight size={18} style={{ color: 'var(--charcoal)' }} /></button>
            <span className="sr-only" aria-live="polite">Spread {i + 1} of {n}: {SPREADS[i].caption}</span>
          </div>
          <div className="flex gap-2.5 mt-4 overflow-x-auto scrollbar-hide pb-1">
            {SPREADS.map((s, idx) => (
              <button key={idx} onClick={() => setI(idx)} aria-label={`View ${s.caption}`} aria-current={idx === i} className="relative flex-shrink-0 rounded-xl overflow-hidden transition-all" style={{ width: 84, height: 56, outline: idx === i ? '2px solid var(--gold)' : 'none', outlineOffset: 2, opacity: idx === i ? 1 : 0.6 }}>
                <Image src={s.src} alt="" fill loading="lazy" sizes="84px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
