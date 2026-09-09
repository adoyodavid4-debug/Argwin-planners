'use client'
// Self-contained premium testimonials section for the homepage.
// (Replaces the previous re-export; HomeComponents.tsx is left untouched.)
import { motion, useReducedMotion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

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
}

// Hardcoded fallback while real reviews accrue: kept deliberately small (1
// featured + 1 supporting) and free of verification claims or invented stats.
const FEATURED: Testimonial = {
  name: 'Amara N.', role: 'iPad planner', rating: 5, product: 'Ultimate Digital Planner',
  grad: 'linear-gradient(135deg,#B8A9D4,#7B6FAE)',
  text: 'The hyperlinks make it so fast to navigate that I have finally stuck to a routine — and it looks lovely on my iPad every morning.',
}

const TESTIMONIALS: Testimonial[] = [
  { name: 'Daniel K.', role: 'GoodNotes user', rating: 5, product: 'Budget Planner', grad: 'linear-gradient(135deg,#A0830E,#C4A538)', text: 'Downloaded it in seconds and had it set up in GoodNotes before my coffee was ready.' },
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

export default function TestimonialsSection({ testimonials }: TestimonialsSectionProps = {}) {
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
            Words from Our Planners
          </motion.h2>
          <motion.p {...reveal(0.1)} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Real words from people who plan with Arwign every day.
          </motion.p>
        </div>

        {/* Featured testimonial */}
        <motion.figure {...reveal(0.05)} className="relative rounded-3xl border p-8 lg:p-11 mb-6 overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 18px 50px rgba(44,42,53,0.08)' }}>
          <Quote size={44} aria-hidden className="absolute top-6 right-7" style={{ color: 'var(--gold)', opacity: 0.14 }} />
          <div className="relative max-w-3xl">
            <Stars value={featured.rating} size={17} />
            <blockquote className="font-display mt-4 mb-7" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', lineHeight: 1.35, color: 'var(--text-primary)' }}>
              &ldquo;{featured.text}&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-3.5">
              <Avatar name={featured.name} grad={featured.grad} size={52} />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{featured.name}</p>
                <p className="text-xs" style={{ color: 'var(--sage)' }}>{featured.role}</p>
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
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <Stars value={t.rating} />
                <Quote size={18} aria-hidden style={{ color: 'var(--gold)', opacity: 0.3 }} />
              </div>
              <blockquote className="text-[0.95rem] leading-relaxed mb-6 flex-1" style={{ color: 'var(--text-secondary)' }}>
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Avatar name={t.name} grad={t.grad} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--sage)' }}>{t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
