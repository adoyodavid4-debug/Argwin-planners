'use client'
import { useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion, useSpring } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { Colourway } from './data'

export default function CoverMockup({ colour, sizeLabel }: { colour: Colourway; sizeLabel: string }) {
  const reduce = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start end', 'end start'] })
  const yRaw = useTransform(scrollYProgress, [0, 1], [26, -26])
  const y = useSpring(yRaw, { stiffness: 80, damping: 20 })

  return (
    <div ref={wrapRef} className="relative flex items-center justify-center" style={{ perspective: 1200 }}>
      <div aria-hidden className="absolute rounded-full blur-3xl opacity-50 transition-colors duration-500" style={{ width: 360, height: 360, background: colour.hex }} />

      <motion.div style={reduce ? undefined : { y }} className="relative">
        <div className="relative" style={{ width: 'min(78vw, 320px)', aspectRatio: '3/4' }}>
          <AnimatePresence mode="sync">
            <motion.div key={colour.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: 'easeInOut' }} className="absolute inset-0">
              {/* page block */}
              <div className="absolute inset-0 rounded-[10px_20px_20px_10px]"
                style={{ boxShadow: '4px 0 0 #efe9dc, 8px 1px 0 #e4ddca, 12px 2px 0 #efe9dc, 16px 3px 0 #e4ddca, 20px 4px 0 #efe9dc' }} />
              {/* cover */}
              <div className="absolute inset-0 rounded-[10px_20px_20px_10px] overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${colour.hex} 0%, ${colour.spine} 100%)`, boxShadow: '0 40px 70px rgba(44,42,53,0.30)' }}>
                <div className="absolute left-0 top-0 bottom-0" style={{ width: 20, background: colour.spine, boxShadow: 'inset -6px 0 12px rgba(0,0,0,0.22)' }} />
                <div className="absolute rounded-[8px]" style={{ inset: '26px 28px 26px 40px', border: `1.5px solid ${colour.ink}33` }} />
                <div className="absolute left-2 right-0 text-center" style={{ top: '36%' }}>
                  <div className="mx-auto mb-3 flex items-center justify-center rounded-full" style={{ width: 56, height: 56, border: `1.5px solid ${colour.ink}66` }}>
                    <Sparkles size={26} style={{ color: colour.ink }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: 30, lineHeight: 1, color: colour.ink, fontWeight: 600 }}>Arwign</p>
                  <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: colour.ink, opacity: 0.85, marginTop: 8 }}>Notebook</p>
                </div>
                <div className="absolute" style={{ right: 34, top: -6, bottom: -6, width: 12, background: 'rgba(0,0,0,0.16)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, transparent 40%)' }} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="absolute bottom-2 right-0 sm:right-6 flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{sizeLabel}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>instant download</span>
      </div>
    </div>
  )
}
