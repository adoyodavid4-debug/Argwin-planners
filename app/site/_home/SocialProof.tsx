'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Star, Download, Users, Heart } from 'lucide-react'

// TODO(reviews): swap for real verified reviews when available.
const QUOTES = [
  { text: 'The most beautiful planner I have ever used. I actually look forward to planning now.', name: 'Amara N.' },
  { text: 'Set up in GoodNotes in minutes and the hyperlinks just work. Worth every penny.', name: 'Daniel K.' },
  { text: 'I have bought three so far — the quality and detail is unmatched for the price.', name: 'Priya S.' },
]

export default function SocialProof() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setI((v) => (v + 1) % QUOTES.length), 4500)
    return () => clearInterval(t)
  }, [reduce])

  const stats = [
    { icon: Star, value: '4.9/5', label: 'Average rating' },
    { icon: Download, value: '50k+', label: 'Downloads' },
    { icon: Users, value: '12k+', label: 'Happy customers' },
    { icon: Heart, value: 'Etsy & Gumroad', label: 'Loved on' },
  ]

  return (
    <section className="border-b py-8" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }} aria-label="Customer trust">
      <div className="container-site grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-center">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col">
              <span className="inline-flex items-center gap-1.5 font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                <Icon size={16} style={{ color: 'var(--gold)' }} /> {value}
              </span>
              <span className="text-[11px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="lg:border-l lg:pl-12 min-h-[54px] flex items-center" style={{ borderColor: 'var(--border)' }}>
          <AnimatePresence mode="wait">
            <motion.blockquote key={i} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>&ldquo;{QUOTES[i].text}&rdquo;</p>
              <footer className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--gold-dark)' }}>— {QUOTES[i].name}, verified buyer</footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
