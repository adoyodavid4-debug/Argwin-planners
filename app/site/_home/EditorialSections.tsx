'use client'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Link2, Ruler, Type, Tablet, Zap, Heart, ShoppingCart, Download, Sparkles, ArrowRight } from 'lucide-react'

function useReveal() {
  const reduce = useReducedMotion()
  return (delay = 0) => reduce ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay } }
}

export function WhyArwign() {
  const reveal = useReveal()
  const items = [
    { icon: Link2,      title: 'Hyperlinked navigation', body: 'Tap any tab to jump between views instantly.' },
    { icon: Ruler,      title: 'Three sizes',            body: 'A4, US Letter and A5 in every download.' },
    { icon: Type,       title: 'Lora + Poppins',         body: 'Editorial type, crafted detail by detail.' },
    { icon: Tablet,     title: 'Works in your apps',     body: 'GoodNotes, Notability, Xodo and print.' },
    { icon: Zap,        title: 'Instant delivery',       body: 'Files land in your inbox at checkout.' },
    { icon: Heart,      title: 'Warm, inclusive design', body: 'Calm layouts made for real, busy lives.' },
  ]
  return (
    <section className="py-16 lg:py-20 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }} aria-label="Why Arwign">
      <div className="container-site">
        <motion.div {...reveal()} className="text-center mb-12 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>The Arwign difference</p>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}>Made to be used, not just bought</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} {...reveal(i * 0.05)} className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={20} style={{ color: 'var(--gold)' }} /></div>
              <h3 className="font-semibold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorks() {
  const reveal = useReveal()
  const steps = [
    { icon: ShoppingCart, title: 'Choose', body: 'Pick a ready-made design or request a personalised one.' },
    { icon: Download,     title: 'Download', body: 'Your files arrive instantly by email and in your account.' },
    { icon: Sparkles,     title: 'Use it anywhere', body: 'Import to GoodNotes or print at home — start today.' },
  ]
  return (
    <section className="py-16 lg:py-20 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }} aria-label="How it works">
      <div className="container-site">
        <motion.div {...reveal()} className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Simple as 1·2·3</p>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}>How it works</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} {...reveal(i * 0.12)} className="text-center flex flex-col items-center">
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
  )
}

export function FinalCTA() {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden border-t py-20 lg:py-28" style={{ borderColor: 'var(--border)', background: `linear-gradient(135deg, rgba(var(--gold-rgb),0.16) 0%, rgba(184,169,212,0.10) 55%, rgba(var(--gold-rgb),0.06) 100%)` }} aria-label="Shop the collection">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full blur-3xl opacity-30 animate-float" style={{ width: 320, height: 320, top: -110, left: '10%', background: 'var(--gold)' }} />
        <div className="absolute rounded-full blur-3xl opacity-25 animate-float-delayed" style={{ width: 260, height: 260, bottom: -90, right: '8%', background: 'var(--lavender)' }} />
      </div>
      <motion.div initial={reduce ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        className="container-site relative text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-4 px-3 py-1.5 rounded-full" style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.16)', letterSpacing: '0.12em' }}><Sparkles size={12} /> Start today</p>
        <h2 className="font-display mb-4" style={{ fontSize: 'clamp(2.1rem,5vw,3.4rem)', color: 'var(--text-primary)', lineHeight: 1.05 }}>Your best-planned year starts here</h2>
        <p className="text-base mb-9 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>Instant download, works in every app, backed by our 30-day happiness promise.</p>
        <Link href="/shop" className="btn-primary text-base !px-9 !py-4">Shop the collection <ArrowRight size={17} /></Link>
      </motion.div>
    </section>
  )
}
