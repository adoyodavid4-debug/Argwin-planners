'use client'
import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Spread } from './data'

export default function InteriorCarousel({ spreads }: { spreads: Spread[] }) {
  const [i, setI] = useState(0)
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})
  const reduce = useReducedMotion()
  const n = spreads.length
  const go = (d: number) => setI((p) => (p + d + n) % n)

  return (
    <div>
      <div
        className="relative rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', aspectRatio: '16/10' }}
        role="group" aria-roledescription="carousel" aria-label="Interior spread previews" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) } if (e.key === 'ArrowRight') { e.preventDefault(); go(1) } }}
      >
        {!loaded[i] && <div className="absolute inset-0 skeleton" />}
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35 }} className="absolute inset-0">
            <Image src={spreads[i].src} alt={spreads[i].alt} fill loading="lazy" sizes="(max-width:1024px) 100vw, 60vw"
              className="object-cover" onLoad={() => setLoaded((m) => ({ ...m, [i]: true }))} />
            <div className="absolute inset-x-0 bottom-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
              <p className="text-sm font-medium text-white">{spreads[i].caption}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <button onClick={() => go(-1)} aria-label="Previous spread" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--charcoal)' }} />
        </button>
        <button onClick={() => go(1)} aria-label="Next spread" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
          <ChevronRight size={18} style={{ color: 'var(--charcoal)' }} />
        </button>
        <span className="sr-only" aria-live="polite">Spread {i + 1} of {n}: {spreads[i].caption}</span>
      </div>

      <div className="flex gap-2.5 mt-4 overflow-x-auto scrollbar-hide pb-1">
        {spreads.map((s, idx) => (
          <button key={idx} onClick={() => setI(idx)} aria-label={`View ${s.caption}`} aria-current={idx === i}
            className="relative flex-shrink-0 rounded-xl overflow-hidden transition-all"
            style={{ width: 84, height: 56, outline: idx === i ? '2px solid var(--gold)' : 'none', outlineOffset: 2, opacity: idx === i ? 1 : 0.65 }}>
            <Image src={s.src} alt="" fill loading="lazy" sizes="84px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
