'use client'
import { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles, Check, Star, Shield, Zap } from 'lucide-react'

// Stylised CSS planner cover (no image → fast LCP, no broken assets)
function Cover({ hex, spine, ink, label }: { hex: string; spine: string; ink: string; label: string }) {
  return (
    <div className="rounded-[10px_18px_18px_10px] overflow-hidden" style={{ width: 190, aspectRatio: '3/4', background: `linear-gradient(135deg, ${hex} 0%, ${spine} 100%)`, boxShadow: '0 30px 60px rgba(44,42,53,0.28)', border: '3px solid var(--bg-card)' }}>
      <div className="relative h-full">
        <div className="absolute left-0 top-0 bottom-0" style={{ width: 14, background: spine, boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.22)' }} />
        <div className="absolute rounded-[6px]" style={{ inset: '16px 16px 16px 26px', border: `1.5px solid ${ink}33` }} />
        <div className="absolute left-1 right-0 text-center" style={{ top: '38%' }}>
          <div className="mx-auto mb-2 flex items-center justify-center rounded-full" style={{ width: 40, height: 40, border: `1.5px solid ${ink}66` }}><Sparkles size={18} style={{ color: ink }} /></div>
          <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, color: ink, fontWeight: 600, lineHeight: 1 }}>Arwign</p>
          <p style={{ fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', color: ink, opacity: 0.85, marginTop: 5 }}>{label}</p>
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, transparent 42%)' }} />
      </div>
    </div>
  )
}

export default function HomeHero() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yRaw = useTransform(scrollYProgress, [0, 1], [0, -80])
  const y = useSpring(yRaw, { stiffness: 60, damping: 20 })

  return (
    <section ref={ref} className="relative overflow-hidden bg-gradient-mesh" style={{ borderBottom: '1px solid var(--border)' }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full blur-3xl opacity-30 animate-float" style={{ width: 380, height: 380, top: -120, right: '4%', background: 'var(--lavender)' }} />
        <div className="absolute rounded-full blur-3xl opacity-25 animate-float-delayed" style={{ width: 300, height: 300, bottom: -100, left: '-2%', background: 'var(--gold)' }} />
      </div>

      <div className="container-site relative grid lg:grid-cols-2 gap-10 lg:gap-8 items-center" style={{ minHeight: 'min(88vh, 760px)', paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
        {/* Copy */}
        <motion.div initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-5 px-3 py-1.5 rounded-full" style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.14)', letterSpacing: '0.14em' }}>
            <Sparkles size={12} /> Premium digital & printable planners
          </p>
          <h1 className="font-display mb-5" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.4rem)', lineHeight: 1.02, color: 'var(--text-primary)' }}>
            Plan your best life,<br /><span style={{ color: 'var(--gold)' }}>beautifully.</span>
          </h1>
          <p className="leading-relaxed max-w-md mb-8" style={{ color: 'var(--text-secondary)', fontSize: '1.12rem' }}>
            Hyperlinked planners & notebooks designed to make organising a joy — instant download, ready for GoodNotes, Notability or print.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-9">
            <Link href="/shop" className="btn-primary">Shop the collection <ArrowRight size={16} /></Link>
            <Link href="/notebooks/personalized" className="btn-outline">Personalise yours</Link>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />)}</span>
              4.9 <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· 12k+ happy planners</span>
            </span>
            <span className="w-px h-4 hidden sm:block" style={{ background: 'var(--border)' }} />
            {[{ icon: Zap, l: 'Instant download' }, { icon: Shield, l: 'Secure checkout' }].map(({ icon: Icon, l }) => (
              <span key={l} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Icon size={13} style={{ color: 'var(--gold)' }} /> {l}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            {['GoodNotes', 'Notability', 'Xodo', 'PDF'].map((b) => (
              <span key={b} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Check size={11} style={{ color: 'var(--sage)' }} /> {b}</span>
            ))}
          </div>
        </motion.div>

        {/* Floating covers */}
        <div className="relative h-[360px] sm:h-[440px] lg:h-[520px] hidden sm:block">
          <motion.div className="absolute inset-0 flex items-center justify-center" style={reduce ? undefined : { y }}>
            <motion.div className="absolute" style={{ transform: 'translateX(-38%) rotate(-9deg)', zIndex: 1 }} animate={reduce ? undefined : { y: [0, -14, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
              <div style={{ transform: 'scale(0.86)' }}><Cover hex="#9CC38C" spine="#83AE73" ink="#33502C" label="Wellness" /></div>
            </motion.div>
            <motion.div className="absolute" style={{ transform: 'translateX(38%) rotate(9deg)', zIndex: 1 }} animate={reduce ? undefined : { y: [0, 16, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}>
              <div style={{ transform: 'scale(0.86)' }}><Cover hex="#F2C6A6" spine="#E3AC85" ink="#7E4A30" label="Budget" /></div>
            </motion.div>
            <motion.div className="absolute" style={{ zIndex: 3 }} animate={reduce ? undefined : { y: [0, -10, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}>
              <Cover hex="#E0A82C" spine="#C28E1C" ink="#6B4E10" label="Daily Planner" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
