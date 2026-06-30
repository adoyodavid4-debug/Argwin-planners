'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Heart, Zap, Star, Download, Users, Globe, Award,
  ArrowRight, BookOpen, Palette, Sparkles, ChevronRight,
} from 'lucide-react'

// ── Shared fade-up variant ────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] } },
})

// ── Static data ───────────────────────────────────────────────
const STATS = [
  { icon: Download, value: '15k+',  label: 'Planners downloaded' },
  { icon: Star,     value: '4.9★',  label: 'Average rating' },
  { icon: Users,    value: '12k+',  label: 'Happy customers' },
  { icon: Globe,    value: '30+',   label: 'Countries served' },
]

const VALUES = [
  {
    icon:  Palette,
    title: 'Design First',
    body:  'Every layout, colour palette, and typeface is chosen deliberately. We start with beauty — then make it functional.',
    accent: 'rgba(201,168,76,0.12)',
    border: 'rgba(201,168,76,0.30)',
  },
  {
    icon:  Heart,
    title: 'Practical Beauty',
    body:  'Beautiful things that actually get used. Our planners are made for the desk, the iPad screen, and the real moments of your day.',
    accent: 'rgba(184,169,212,0.12)',
    border: 'rgba(184,169,212,0.30)',
  },
  {
    icon:  Zap,
    title: 'Instant Access',
    body:  'No waiting, no shipping. You buy, you download, you plan — in under 60 seconds. Every product is ready immediately.',
    accent: 'rgba(168,181,160,0.12)',
    border: 'rgba(168,181,160,0.30)',
  },
]

const PHILOSOPHY = [
  {
    icon:  BookOpen,
    title: 'Undated by Design',
    body:  'Start any day of any year. No wasted pages, no guilt about missing a week. Our planners meet you where you are.',
  },
  {
    icon:  Sparkles,
    title: 'Multi-Format Ready',
    body:  'PDF, GoodNotes, Notability, Xodo — every planner ships in the formats your setup actually uses.',
  },
  {
    icon:  Award,
    title: 'Quality You Can Feel',
    body:  'From hyperlinked tabs to perfectly balanced margins, every detail is tested before a product reaches the shop.',
  },
]

export default function AboutClient() {
  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ 1. Hero ════════════════════════════════════════════ */}
      <section
        className="relative w-full pt-16 pb-20 border-b overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.13) 0%, rgba(184,169,212,0.09) 55%, rgba(201,168,76,0.05) 100%)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--gold-light) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--lavender) 0%, transparent 70%)' }} />

        <div className="container-site relative">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-8 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>About</span>
          </nav>

          <div className="max-w-3xl">
            <motion.div
              initial="hidden" animate="show" variants={stagger(0)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
              style={{ background: 'rgba(201,168,76,0.10)', borderColor: 'rgba(201,168,76,0.30)' }}
            >
              <Heart size={13} style={{ color: 'var(--gold)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>
                Our Story
              </span>
            </motion.div>

            <motion.h1
              initial="hidden" animate="show" variants={stagger(0.1)}
              className="font-display mb-5"
              style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}
            >
              Planners designed{' '}
              <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>with intention.</em>
            </motion.h1>

            <motion.p
              initial="hidden" animate="show" variants={stagger(0.2)}
              className="text-base leading-relaxed max-w-2xl mb-10"
              style={{ color: 'var(--text-secondary)' }}
            >
              At Arwign Planners, we believe a well-designed planner changes everything — the way you think,
              the way you plan, and the way you show up every single day. We build tools that are as beautiful
              as they are useful, and as calming as they are effective.
            </motion.p>

            {/* Stats bar */}
            <motion.div
              initial="hidden" animate="show" variants={stagger(0.3)}
              className="grid grid-cols-2 sm:grid-cols-4 gap-6"
            >
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="text-center">
                  <div className="flex justify-center mb-1.5" style={{ color: 'var(--gold)' }}>
                    <Icon size={16} />
                  </div>
                  <p className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-xs mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 2. Our Story ═══════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            {/* Image */}
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
              className="w-full lg:w-[45%] flex-shrink-0"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5]">
                <Image
                  src="https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=85"
                  alt="Arwign Planners — our workspace"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
                {/* Overlay tag */}
                <div
                  className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl backdrop-blur-md"
                  style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.6)' }}
                >
                  <p className="font-display text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    Founded with a purpose
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Every planner begins with a real planning problem we wanted to solve.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
              className="flex-1"
            >
              <div className="divider-gold mb-6" />
              <h2 className="font-display text-4xl mb-6" style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}>
                It started with a blank notebook<br />
                <em style={{ color: 'var(--gold)' }}>and a lot of frustration.</em>
              </h2>
              <div className="space-y-4 text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  We tried every planner on the market. Some were too rigid — pages tied to specific months,
                  wasted within weeks. Others were so minimal they offered no guidance at all. And most
                  of the beautiful ones? Completely impractical to actually use.
                </p>
                <p>
                  So we built our own. What started as a personal system quietly became something our
                  friends wanted, then strangers — and Arwign Planners was born.
                </p>
                <p>
                  Today we design every product the same way we designed that first one: obsessively,
                  with a real person in front of us, asking <em>"would they actually use this?"</em>
                  every step of the way.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-full border text-xs font-medium"
                  style={{ background: 'rgba(201,168,76,0.09)', borderColor: 'rgba(201,168,76,0.25)', color: 'var(--gold-dark)' }}>
                  ✦ Est. 2022
                </div>
                <div className="px-4 py-2 rounded-full border text-xs font-medium"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  ◆ 50+ products designed
                </div>
                <div className="px-4 py-2 rounded-full border text-xs font-medium"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  ❋ Made for real planners
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 3. Values ══════════════════════════════════════════ */}
      <section className="py-20 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="container-site">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-14"
          >
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl mb-4" style={{ color: 'var(--text-primary)' }}>
              What we stand for
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Three principles guide every product decision we make — from the first sketch to the final download.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map(({ icon: Icon, title, body, accent, border }, i) => (
              <motion.div
                key={title}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={stagger(i * 0.12)}
                className="p-7 rounded-3xl border"
                style={{ background: accent, borderColor: border }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(201,168,76,0.15)' }}
                >
                  <Icon size={20} style={{ color: 'var(--gold)' }} />
                </div>
                <h3 className="font-display text-xl mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 4. Product Philosophy ══════════════════════════════ */}
      <section className="py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">

            {/* Image */}
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
              className="w-full lg:w-[44%] flex-shrink-0"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[4/3]">
                <Image
                  src="https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=85"
                  alt="Planning with Arwign digital planner on iPad"
                  fill
                  sizes="(max-width: 1024px) 100vw, 44vw"
                  className="object-cover"
                />
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
              className="flex-1"
            >
              <div className="divider-gold mb-6" />
              <h2 className="font-display text-4xl mb-4" style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}>
                Built for how you{' '}
                <em style={{ color: 'var(--gold)' }}>actually plan.</em>
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
                We design for the real moments — the Sunday night planning sessions, the Thursday reset,
                the random Tuesday when you decide to finally get organised. Not for a hypothetical perfectly
                disciplined person who never misses a day.
              </p>

              <div className="space-y-5">
                {PHILOSOPHY.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.20)' }}
                    >
                      <Icon size={16} style={{ color: 'var(--gold)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 5. The Numbers ═════════════════════════════════════ */}
      <section
        className="py-20 border-b"
        style={{
          background: 'linear-gradient(135deg, rgba(44,42,53,0.97) 0%, rgba(30,28,40,1) 100%)',
          borderColor: 'transparent',
        }}
      >
        <div className="container-site text-center">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          >
            <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ color: 'var(--gold)', letterSpacing: '0.15em' }}>
              By the numbers
            </p>
            <h2 className="font-display text-4xl mb-14" style={{ color: '#F0EDF8', lineHeight: 1.1 }}>
              The impact so far
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '15,000+', label: 'Planners downloaded',  sub: 'and counting' },
              { value: '4.9 / 5', label: 'Average rating',       sub: 'from verified buyers' },
              { value: '50+',     label: 'Unique products',      sub: 'across 9 categories' },
              { value: '30+',     label: 'Countries reached',    sub: 'from one small idea' },
            ].map(({ value, label, sub }, i) => (
              <motion.div
                key={label}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={stagger(i * 0.1)}
                className="text-center"
              >
                <p className="font-display font-bold" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--gold)' }}>
                  {value}
                </p>
                <p className="font-semibold text-sm mt-1" style={{ color: '#F0EDF8', fontFamily: 'var(--font-jost)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A7590' }}>{sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 6. Customer Love ═══════════════════════════════════ */}
      <section className="py-20 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="container-site">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-12"
          >
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl mb-3" style={{ color: 'var(--text-primary)' }}>
              What our customers say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: `"I've tried every planner app out there. Arwign is the first one that actually stayed on my iPad screen for more than a week."`,
                name:  'Amara N.',
                role:  'Teacher, Nairobi',
                stars: 5,
              },
              {
                quote: `"The budget planner literally changed my savings habits. Six months in and I've hit every target I set."`,
                name:  'James K.',
                role:  'Accountant, London',
                stars: 5,
              },
              {
                quote: `"I ordered the complete bundle and haven't touched another planner since. Worth every penny — the quality is unreal."`,
                name:  'Sofia R.',
                role:  'Designer, Melbourne',
                stars: 5,
              },
            ].map(({ quote, name, role, stars }, i) => (
              <motion.div
                key={name}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={stagger(i * 0.12)}
                className="p-6 rounded-2xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, j) => (
                    <Star key={j} size={13} fill="var(--gold)" style={{ color: 'var(--gold)' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4 italic" style={{ color: 'var(--text-secondary)' }}>{quote}</p>
                <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>{name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 7. Meet the Team ═══════════════════════════════════ */}
      <section className="py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-12"
          >
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl mb-3" style={{ color: 'var(--text-primary)' }}>
              The people behind the planners
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              A small, passionate team obsessed with design, productivity, and making your days feel a little more intentional.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              {
                name:  'Arwign Studio',
                role:  'Founder & Lead Designer',
                bio:   'Combining a background in graphic design with a deep obsession with productivity, our founder spends every waking hour thinking about how a planner could be just a little bit better.',
                img:   'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
              },
              {
                name:  'The Design Team',
                role:  'Layout & UX Designers',
                bio:   'Our small remote team tests every planner template across GoodNotes, Notability, Xodo, and print before it ever reaches the shop. No template ships without 100+ hours of real-world testing.',
                img:   'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80',
              },
            ].map(({ name, role, bio, img }, i) => (
              <motion.div
                key={name}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={stagger(i * 0.15)}
                className="flex flex-col items-center text-center max-w-xs p-6 rounded-3xl border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <div className="relative w-24 h-24 rounded-full overflow-hidden mb-5"
                  style={{ boxShadow: '0 0 0 4px rgba(201,168,76,0.3)' }}>
                  <Image src={img} alt={name} fill sizes="96px" className="object-cover" />
                </div>
                <p className="font-display text-xl mb-0.5" style={{ color: 'var(--text-primary)' }}>{name}</p>
                <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: 'var(--gold)', letterSpacing: '0.08em' }}>{role}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 8. CTA ═════════════════════════════════════════════ */}
      <section
        className="py-20"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(184,169,212,0.08) 60%, rgba(201,168,76,0.04) 100%)',
        }}
      >
        <div className="container-site text-center">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          >
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-4xl mb-4" style={{ color: 'var(--text-primary)' }}>
              Ready to plan{' '}
              <em style={{ color: 'var(--gold)' }}>better?</em>
            </h2>
            <p className="text-sm max-w-md mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>
              Browse our full collection of digital and printable planners. Find your perfect system — then download and start today.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/shop" className="btn-primary">
                Shop All Planners
                <ArrowRight size={15} />
              </Link>
              <Link href="/best-sellers" className="btn-outline">
                See Best Sellers
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-12 text-xs" style={{ color: 'var(--text-muted)' }}>
              {['⚡ Instant download', '⭐ 4.9 star average', '🔄 Start any month', '🔒 Secure checkout'].map((b) => (
                <span key={b}>{b}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  )
}
