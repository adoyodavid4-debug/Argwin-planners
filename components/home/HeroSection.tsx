'use client'
import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Download, Sparkles } from 'lucide-react'

const stats = [
  { value: '50K+', label: 'Happy Planners' },
  { value: '200+', label: 'Premium Templates' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '100%', label: 'Instant Download' },
]

const floatingBadges = [
  { text: 'GoodNotes Ready',   icon: '✦', top: '18%',  left: '4%',  delay: 0 },
  { text: 'iPad Optimized',    icon: '◆', top: '60%',  left: '2%',  delay: 0.4 },
  { text: 'PDF + Hyperlinks',  icon: '❋', top: '22%',  right: '3%', delay: 0.2 },
  { text: 'Instant Download',  icon: '↓', top: '65%',  right: '4%', delay: 0.6 },
]

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] })
  const y      = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col justify-center overflow-hidden"
      aria-label="Hero — Plan Your Best Life"
    >
      {/* ── Background mesh gradient ─────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 0%, rgba(184,169,212,0.18) 0%, transparent 60%),
              radial-gradient(ellipse 70% 50% at 80% 100%, rgba(232,197,192,0.15) 0%, transparent 60%),
              radial-gradient(ellipse 60% 70% at 50% 50%, rgba(224,168,44,0.06) 0%, transparent 70%),
              var(--bg-primary)
            `,
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Floating badges ──────────────────────────── */}
      {floatingBadges.map((badge, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 + badge.delay, duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
          className="absolute hidden xl:flex items-center gap-2 glass rounded-full px-4 py-2 text-xs font-semibold animate-float"
          style={{
            top: badge.top,
            left: 'left' in badge ? badge.left : undefined,
            right: 'right' in badge ? badge.right : undefined,
            color: 'var(--text-secondary)',
            animationDelay: `${badge.delay}s`,
            zIndex: 2,
          }}
        >
          <span style={{ color: 'var(--gold)' }}>{badge.icon}</span>
          {badge.text}
        </motion.div>
      ))}

      {/* ── Main content ─────────────────────────────── */}
      <motion.div style={{ y, opacity }} className="container-site relative z-10 pt-24 pb-20">
        <div className="max-w-4xl mx-auto text-center">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{
                background: 'rgba(224,168,44,0.12)',
                color: 'var(--gold-dark)',
                border: '1px solid rgba(224,168,44,0.25)',
                letterSpacing: '0.12em',
              }}
            >
              <Sparkles size={12} />
              Premium Digital Planner & Notebook Shop
              <Sparkles size={12} />
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display mb-6"
            style={{
              fontSize: 'clamp(3rem, 7vw, 6rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
            }}
          >
            Plan Your
            <span
              className="block italic"
              style={{
                background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 40%, var(--gold) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Best Life
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Download premium digital planners, printable templates, and productivity tools designed for professionals, students, moms, and dreamers — all with instant download access.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/shop" className="btn-primary text-sm px-8 py-4 group">
              <Download size={16} />
              Download Premium Planners
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/shop/category/planner-bundles" className="btn-outline text-sm px-8 py-4">
              Explore Bundle Deals
            </Link>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto"
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div
                  className="font-display text-3xl font-semibold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {stat.value}
                </div>
                <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Lifestyle Photo Collage ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="container-site relative z-10 pb-20"
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="relative rounded-3xl overflow-hidden shadow-glass-lg border grid grid-cols-3"
            style={{ borderColor: 'var(--border-gold)', minHeight: 280 }}
          >
            {[
              { id: '1529651737248-dad5e287768e', label: 'Daily Planner',     tag: 'Most Popular' },
              { id: '1513128034602-7814ccaddd4e', label: 'Printable Planner', tag: 'Instant PDF' },
              { id: '1558478551-be297c7bb253',    label: 'Desk Setup',         tag: 'Flat Lay' },
            ].map((img, i) => (
              <motion.div
                key={i}
                className="relative overflow-hidden group"
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1 + i * 0.2, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Image
                  src={`https://images.unsplash.com/photo-${img.id}?w=600&q=80&fit=crop&crop=entropy`}
                  alt={img.label}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 33vw, 400px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1"
                    style={{ background: 'rgba(224,168,44,0.85)', color: '#fff' }}
                  >
                    {img.tag}
                  </span>
                  <p className="text-white text-sm font-semibold drop-shadow">{img.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Scroll indicator ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-px h-8"
          style={{ background: 'linear-gradient(to bottom, var(--gold), transparent)' }}
        />
      </motion.div>
    </section>
  )
}
