'use client'
import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from 'framer-motion'
import {
  Heart, Star, Download, Users, Globe, ArrowRight, ChevronRight, Sparkles,
  Palette, PenTool, Tablet, Ruler, Link2, Type, Check, Quote, BadgeCheck, Leaf, Award,
} from 'lucide-react'

const BRAND_GREEN = '#2E4A38' // forest-green brand mark

// ── Data ──────────────────────────────────────────────────────
const STATS = [
  { icon: Download, value: '15k+', label: 'Planners downloaded' },
  { icon: Star,     value: '4.9★', label: 'Average rating' },
  { icon: Users,    value: '12k+', label: 'Happy customers' },
  { icon: Globe,    value: '30+',  label: 'Countries served' },
]

const VALUES = [
  { icon: Heart,   title: 'Warm & inclusive design', body: 'Calm, non-clinical layouts made for real, busy, wonderfully imperfect lives.' },
  { icon: PenTool, title: 'Thoughtful craftsmanship', body: 'Every margin, tab and typeface is hand-considered and tested before release.' },
  { icon: Tablet,  title: 'Works in your apps',        body: 'GoodNotes, Notability, Xodo or print — your planner goes wherever you do.' },
  { icon: Check,   title: 'Made to actually be used',  body: 'Beautiful, yes — but built for the desk, the iPad, and the everyday moment.' },
]

const CRAFT = [
  { icon: Link2,  title: 'Hyperlinked navigation', body: 'Tap any tab to jump between views instantly.' },
  { icon: Ruler,  title: 'Three sizes',            body: 'A4, US Letter and A5 in every download.' },
  { icon: Palette,title: 'A warm, calm palette',    body: 'Cream, peach, sage, golden and terracotta.' },
  { icon: Type,   title: 'Lora + Poppins',          body: 'Editorial serif headings, clean modern body.' },
  { icon: Tablet, title: 'App compatible',          body: 'GoodNotes, Notability, Xodo and any PDF app.' },
  { icon: Leaf,   title: 'Undated & reusable',      body: 'Start any day; reuse year after year.' },
]

const TESTIMONIALS = [
  { quote: 'I have tried every planner app out there. Arwign is the first that actually stayed on my iPad for more than a week.', name: 'Amara N.', role: 'Teacher, Nairobi', grad: 'linear-gradient(135deg,#B8A9D4,#7B6FAE)' },
  { quote: 'The budget planner genuinely changed my savings habits. Six months in and I have hit every target I set.', name: 'James K.', role: 'Accountant, London', grad: 'linear-gradient(135deg,#C9A84C,#E2C97E)' },
  { quote: 'I ordered the complete bundle and have not touched another planner since. The quality is unreal.', name: 'Sofia R.', role: 'Designer, Melbourne', grad: 'linear-gradient(135deg,#E8C5C0,#C9847C)' },
]

const JOURNEY = [
  { year: '2022', title: 'A blank notebook', body: 'Frustrated with every planner on the market, we designed our own.' },
  { year: '2023', title: 'Word got around', body: 'Friends, then strangers, wanted a copy — and Arwign was born.' },
  { year: 'Today', title: 'A growing collection', body: '50+ products across 9 categories, loved in 30+ countries.' },
]

function Stars({ value = 5, size = 13 }: { value?: number; size?: number }) {
  return <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} style={{ fill: i <= value ? 'var(--gold)' : 'transparent', stroke: i <= value ? 'var(--gold)' : 'var(--border)' }} />)}</span>
}

export default function AboutClient() {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const yRaw = useTransform(scrollYProgress, [0, 1], [0, -60])
  const parallax = useSpring(yRaw, { stiffness: 60, damping: 20 })

  const reveal = (d = 0) => reduce ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.55, delay: d } }
  const heroIn = (d = 0) => reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: d } }

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ 1. HERO ════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative w-full pt-12 pb-16 lg:pb-20 border-b overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.13) 0%, rgba(184,169,212,0.09) 55%, rgba(201,168,76,0.05) 100%)', borderColor: 'var(--border)' }}>
        <div aria-hidden className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 pointer-events-none blur-3xl" style={{ background: 'var(--gold-light)' }} />
        <div className="container-site relative">
          <nav className="flex items-center gap-1.5 mb-8 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>About</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <motion.div {...heroIn(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6" style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.30)' }}>
                <Heart size={13} style={{ color: 'var(--gold)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>Our Story</span>
              </motion.div>
              <motion.h1 {...heroIn(0.08)} className="font-display mb-5" style={{ fontSize: 'clamp(2.5rem,5.5vw,4rem)', lineHeight: 1.04, color: 'var(--text-primary)' }}>
                Beautiful tools for a<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>calmer, kinder</em> way to plan.
              </motion.h1>
              <motion.p {...heroIn(0.16)} className="text-base leading-relaxed max-w-md mb-9" style={{ color: 'var(--text-secondary)' }}>
                Arwign makes warm, inclusive planners and notebooks that feel good to use — so organising your life feels less like a chore and more like a small daily kindness.
              </motion.p>
              <motion.div {...heroIn(0.24)} className="grid grid-cols-2 sm:grid-cols-4 gap-5 max-w-lg">
                {STATS.map(({ icon: Icon, value, label }) => (
                  <div key={label}>
                    <div className="flex mb-1.5" style={{ color: 'var(--gold)' }}><Icon size={15} /></div>
                    <p className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    <p className="text-[11px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Supporting visual (parallax) */}
            <motion.div {...heroIn(0.15)} className="relative hidden lg:block">
              <motion.div style={reduce ? undefined : { y: parallax }} className="relative rounded-3xl overflow-hidden shadow-2xl" >
                <div className="relative" style={{ aspectRatio: '4/5' }}>
                  <Image src="https://images.unsplash.com/photo-1517842645767-c639042777db?w=900&q=85" alt="A calm planning workspace with an open Arwign planner" fill priority sizes="45vw" className="object-cover" />
                </div>
                <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.6)' }}>
                  <p className="font-display text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Designed to be used</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Every planner begins with a real planning problem we wanted to solve.</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 2. OUR STORY ═══════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div {...reveal()} className="w-full lg:w-[45%] flex-shrink-0">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: '4/5' }}>
                <Image src="https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=85" alt="An open planner beside a warm cup of coffee" fill loading="lazy" sizes="(max-width:1024px) 100vw, 45vw" className="object-cover" />
              </div>
            </motion.div>
            <motion.div {...reveal(0.05)} className="flex-1">
              <div className="divider-gold mb-6" />
              <h2 className="font-display text-4xl mb-6" style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}>
                It started with a blank notebook<br /><em style={{ color: 'var(--gold)' }}>and a lot of frustration.</em>
              </h2>
              <div className="flex flex-col gap-4 text-[0.98rem] leading-7" style={{ color: 'var(--text-secondary)' }}>
                <p>We tried every planner on the market. Some were too rigid — pages tied to specific months, wasted within weeks. Others were so minimal they offered no guidance at all. And most of the beautiful ones? Completely impractical to actually use.</p>
                <p>So we built our own. What started as a personal system quietly became something our friends wanted, then strangers — and Arwign was born.</p>
                <p>Today we design every product the same way we designed that first one: obsessively, with a real person in front of us, asking <em>&ldquo;would they actually use this?&rdquo;</em> every step of the way.</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {['✦ Est. 2022', '◆ 50+ products designed', '❋ Made for real planners'].map((t, i) => (
                  <span key={t} className="px-4 py-2 rounded-full border text-xs font-medium" style={{ background: i === 0 ? 'rgba(var(--gold-rgb),0.09)' : 'var(--bg-secondary)', borderColor: i === 0 ? 'rgba(var(--gold-rgb),0.25)' : 'var(--border)', color: i === 0 ? 'var(--gold-dark)' : 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 3. VALUES ══════════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="container-site">
          <motion.div {...reveal()} className="text-center mb-14 max-w-xl mx-auto">
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl mb-4" style={{ color: 'var(--text-primary)' }}>What we stand for</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>A few beliefs guide every product decision we make — from the first sketch to the final download.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, body }, i) => (
              <motion.div key={title} {...reveal(i * 0.08)} className="p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}><Icon size={20} style={{ color: 'var(--gold)' }} /></div>
                <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 4. THE CRAFT ═══════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div {...reveal()} className="order-last lg:order-first">
            <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ aspectRatio: '4/3' }}>
              <Image src="https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=900&q=85" alt="Close-up of an Arwign planner interior spread" fill loading="lazy" sizes="(max-width:1024px) 100vw, 45vw" className="object-cover" />
            </div>
          </motion.div>
          <motion.div {...reveal(0.05)}>
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl mb-4" style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}>The care in every <em style={{ color: 'var(--gold)' }}>page.</em></h2>
            <p className="text-sm leading-relaxed mb-8 max-w-md" style={{ color: 'var(--text-secondary)' }}>Nothing here is a template dropped into a shop. Every layout is hand-considered and tested across devices and print before it reaches you.</p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              {CRAFT.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={17} style={{ color: 'var(--gold)' }} /></div>
                  <div><p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p><p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{body}</p></div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ 5. THE MAKER ═══════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="container-site max-w-4xl mx-auto">
          <motion.div {...reveal()} className="rounded-3xl border overflow-hidden grid md:grid-cols-[auto_1fr]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {/* Brand mark (forest green) — TODO: replace with a real founder portrait */}
            <div className="flex items-center justify-center p-10 md:p-12" style={{ background: BRAND_GREEN }}>
              <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ border: '2px solid rgba(255,255,255,0.35)' }}>
                <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 52, fontWeight: 600, color: '#fff' }}>A</span>
              </div>
            </div>
            <div className="p-8 md:p-10">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.1em' }}><Award size={13} /> The maker</p>
              <h2 className="font-display text-3xl mb-4" style={{ color: 'var(--text-primary)' }}>The person behind Arwign</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                Arwign is a small, independent studio led by a designer who spent years frustrated by planners that were either beautiful or useful, but never both. Combining a background in graphic design with a genuine obsession for calm, intentional productivity, every product is drawn, tested and refined by hand.
              </p>
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                {/* TODO(bio): replace with the real founder name, photo and personal bio when available. */}
                Founder bio &amp; portrait — placeholder, to be replaced with real details.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ 6. SOCIAL PROOF ════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <motion.div {...reveal()} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-14 text-center">
            <span className="inline-flex items-center gap-2"><Stars size={16} /><span className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>4.9</span><span className="text-sm" style={{ color: 'var(--text-muted)' }}>average</span></span>
            <span className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}><b style={{ color: 'var(--text-primary)' }}>12,000+</b> happy customers</span>
            <span className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />
            <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}><Sparkles size={13} style={{ color: 'var(--gold)' }} /> Loved on Etsy &amp; Gumroad</span>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure key={t.name} {...reveal(i * 0.08)} className="p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <Quote size={22} style={{ color: 'var(--gold)', opacity: 0.4 }} className="mb-3" />
                <Stars size={13} />
                <p className="text-sm leading-relaxed my-4 flex-1" style={{ color: 'var(--text-secondary)' }}>&ldquo;{t.quote}&rdquo;</p>
                <figcaption className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: t.grad }}>{t.name.charAt(0)}</span>
                  <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p><p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> {t.role}</p></div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 7. JOURNEY ═════════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="container-site max-w-4xl mx-auto">
          <motion.div {...reveal()} className="text-center mb-14">
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl" style={{ color: 'var(--text-primary)' }}>The journey so far</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {JOURNEY.map((m, i) => (
              <motion.div key={m.year} {...reveal(i * 0.1)} className="text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 font-display text-sm font-bold" style={{ background: 'var(--bg-card)', border: '2px solid var(--gold)', color: 'var(--gold-dark)' }}>{m.year}</div>
                <h3 className="font-semibold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>{m.title}</h3>
                <p className="text-sm leading-relaxed max-w-[220px]" style={{ color: 'var(--text-secondary)' }}>{m.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 8. CTA ═════════════════════════════════════════════ */}
      <section className="py-20 newsletter-gradient">
        <div className="container-site text-center">
          <motion.div {...reveal()}>
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl mb-4" style={{ color: 'var(--text-primary)' }}>Ready to plan <em style={{ color: 'var(--gold)' }}>better?</em></h2>
            <p className="text-sm max-w-md mx-auto mb-9" style={{ color: 'var(--text-secondary)' }}>Browse our full collection of digital and printable planners. Find your perfect system — then download and start today.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/shop" className="btn-primary">Explore our planners <ArrowRight size={15} /></Link>
              <Link href="/best-sellers" className="btn-outline">See best sellers</Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-12 text-xs" style={{ color: 'var(--text-muted)' }}>
              {[{ icon: Download, l: 'Instant download' }, { icon: Star, l: '4.9 average' }, { icon: Leaf, l: 'Undated & reusable' }, { icon: Heart, l: 'Loved worldwide' }].map(({ icon: Icon, l }) => (
                <span key={l} className="inline-flex items-center gap-1.5"><Icon size={12} style={{ color: 'var(--gold)' }} /> {l}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
