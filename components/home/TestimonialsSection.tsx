'use client'
// Self-contained premium testimonials section for the homepage.
// (Replaces the previous re-export; HomeComponents.tsx is left untouched.)
import { motion, useReducedMotion } from 'framer-motion'
import { Star, Quote, BadgeCheck, Sparkles } from 'lucide-react'

// ── Aggregate proof (fallbacks when settings are absent) ─────
const RATING = '4.9'
const REVIEWS = '2,400+'
const CUSTOMERS = '50,000+'

interface Testimonial { name: string; role: string; text: string; rating: number; product?: string; grad: string }

// Shape passed in from the DB via the server wrapper (TestimonialsSectionServer).
export interface TestimonialInput {
  name: string
  role: string | null
  quote: string
  rating: number
  product_label: string | null
  gradient: string | null
  is_featured: boolean
}

export interface TestimonialsSectionProps {
  testimonials?: TestimonialInput[]
  rating?: string
  reviews?: string
  customers?: string
}

const FEATURED: Testimonial = {
  name: 'Amara N.', role: 'Verified buyer · London', rating: 5, product: 'Ultimate Digital Planner',
  grad: 'linear-gradient(135deg,#B8A9D4,#7B6FAE)',
  text: 'Genuinely the most beautiful planner I have ever used. The hyperlinks make it so fast to navigate that I have finally stuck to a routine — and it looks gorgeous on my iPad every single morning.',
}

const TESTIMONIALS: Testimonial[] = [
  { name: 'Daniel K.', role: 'Verified buyer · GoodNotes user', rating: 5, product: 'Budget Planner', grad: 'linear-gradient(135deg,#A0830E,#C4A538)', text: 'Downloaded it in seconds and had it set up before my coffee was ready. Worth every penny.' },
  { name: 'Priya S.', role: 'Verified buyer · Manchester', rating: 5, product: 'Wellness Journal', grad: 'linear-gradient(135deg,#E8C5C0,#C9847C)', text: 'I have bought planners I never opened. This one I actually look forward to — the design just makes you want to plan.' },
  { name: 'Tomas R.', role: 'Verified buyer · Notability user', rating: 5, product: 'Academic Planner', grad: 'linear-gradient(135deg,#A8B5A0,#6E7E66)', text: 'The layouts are gorgeous and the tabs just work. Easily my favourite purchase this year.' },
  { name: 'Lena M.', role: 'Verified buyer · Berlin', rating: 5, product: '66-Day Habit Tracker', grad: 'linear-gradient(135deg,#C97B5A,#AE6244)', text: 'A game-changer for my study system — everything finally lives in one tidy, hyperlinked notebook.' },
  { name: 'Sophie L.', role: 'Verified buyer · Etsy', rating: 5, product: 'Student Planner', grad: 'linear-gradient(135deg,#B8A9D4,#7B6FAE)', text: 'Changed how I plan my entire week. I keep recommending it to everyone at work.' },
  { name: 'Nadia B.', role: 'Verified buyer · Gumroad', rating: 5, product: 'Digital Notebook', grad: 'linear-gradient(135deg,#A0830E,#C28E1C)', text: 'Beautiful, calm and genuinely useful. Printed the A5 size too and it looks just as lovely on paper.' },
]

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} strokeWidth={1.6} style={{ fill: i <= value ? 'var(--gold)' : 'transparent', stroke: i <= value ? 'var(--gold)' : 'var(--border)' }} />)}
    </span>
  )
}

function Avatar({ name, grad, size = 40 }: { name: string; grad: string; size?: number }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" aria-hidden
      style={{ width: size, height: size, background: grad, fontSize: size * 0.38, fontFamily: 'var(--font-jost)' }}>{initials}</span>
  )
}

const DEFAULT_GRAD = 'linear-gradient(135deg,#A0830E,#C4A538)'

export default function TestimonialsSection({
  testimonials,
  rating = RATING,
  reviews = REVIEWS,
  customers = CUSTOMERS,
}: TestimonialsSectionProps = {}) {
  const reduce = useReducedMotion()

  // DB testimonials win; hardcoded content is the fallback when the table is
  // empty or the props are absent — the section never breaks.
  let featured: Testimonial = FEATURED
  let supporting: Testimonial[] = TESTIMONIALS
  if (testimonials && testimonials.length > 0) {
    const mapped: Testimonial[] = testimonials.map((t) => ({
      name:    t.name,
      role:    t.role ?? '',
      text:    t.quote,
      rating:  t.rating,
      product: t.product_label ?? undefined,
      grad:    t.gradient ?? DEFAULT_GRAD,
    }))
    const featuredIdx = testimonials.findIndex((t) => t.is_featured)
    const idx = featuredIdx >= 0 ? featuredIdx : 0
    featured = mapped[idx]
    supporting = mapped.filter((_, i) => i !== idx)
  }
  const reveal = (delay = 0) => reduce ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.5, delay } }

  return (
    <section className="section w-full" aria-labelledby="testimonials-heading" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site">

        {/* Header */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <motion.p {...reveal()} className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>What Our Planners Say</motion.p>
          <motion.h2 {...reveal(0.05)} id="testimonials-heading" className="font-display text-display-md mb-4" style={{ color: 'var(--text-primary)' }}>
            Loved by 50,000+ Planners
          </motion.h2>
          <motion.p {...reveal(0.1)} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Real words from people who plan with Arwign every day — join a community that has made organising a joy.
          </motion.p>
        </div>

        {/* Aggregate trust bar */}
        <motion.div {...reveal(0.12)} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-14 pb-10 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="inline-flex items-center gap-2">
            <Stars value={5} size={16} />
            <span className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{rating}</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>average</span>
          </span>
          <span className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}><b style={{ color: 'var(--text-primary)' }}>{reviews}</b> verified reviews</span>
          <span className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}><b style={{ color: 'var(--text-primary)' }}>{customers}</b> happy customers</span>
          <span className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}><Sparkles size={13} style={{ color: 'var(--gold)' }} /> Loved on Etsy &amp; Gumroad</span>
        </motion.div>

        {/* Featured testimonial */}
        <motion.figure {...reveal(0.05)} className="relative rounded-3xl border p-8 lg:p-11 mb-6 overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 18px 50px rgba(44,42,53,0.08)' }}
          itemScope itemType="https://schema.org/Review">
          <Quote size={44} aria-hidden className="absolute top-6 right-7" style={{ color: 'var(--gold)', opacity: 0.14 }} />
          <div className="relative max-w-3xl">
            <Stars value={featured.rating} size={17} />
            <blockquote className="font-display mt-4 mb-7" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', lineHeight: 1.35, color: 'var(--text-primary)' }} itemProp="reviewBody">
              &ldquo;{featured.text}&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-3.5">
              <Avatar name={featured.name} grad={featured.grad} size={52} />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }} itemProp="author">{featured.name}</p>
                <p className="text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--sage)' }}><BadgeCheck size={12} /> {featured.role}</p>
              </div>
              {featured.product && <span className="badge badge-gold text-[10px] ml-auto hidden sm:inline-flex">{featured.product}</span>}
            </figcaption>
          </div>
        </motion.figure>

        {/* Supporting wall of proof */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supporting.map((t, i) => (
            <motion.figure key={t.name} {...reveal(0.05 + (i % 3) * 0.08)}
              className="flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-product"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              itemScope itemType="https://schema.org/Review">
              <div className="flex items-center justify-between mb-3">
                <Stars value={t.rating} />
                <Quote size={18} aria-hidden style={{ color: 'var(--gold)', opacity: 0.3 }} />
              </div>
              <blockquote className="text-[0.95rem] leading-relaxed mb-6 flex-1" style={{ color: 'var(--text-secondary)' }} itemProp="reviewBody">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Avatar name={t.name} grad={t.grad} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }} itemProp="author">{t.name}</p>
                  <p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> {t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
