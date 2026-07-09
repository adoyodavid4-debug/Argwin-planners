'use client'
// components/home/BenefitsStrip.tsx
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Zap, Download, RefreshCcw, Shield, Smartphone, Star } from 'lucide-react'

const benefits = [
  { icon: Zap,         title: 'Instant Download',    desc: 'Access your planners immediately after purchase' },
  { icon: Smartphone,  title: 'Works Everywhere',    desc: 'Compatible with GoodNotes, Notability, iPad & more' },
  { icon: RefreshCcw,  title: 'Undated Flexibility', desc: 'Start any day, any month — no wasted pages' },
  { icon: Download,    title: 'Multiple Formats',    desc: 'PDF, GoodNotes, Notability & printable versions' },
  { icon: Shield,      title: '100% Secure',         desc: 'Encrypted checkout with Stripe & PayPal' },
  { icon: Star,        title: 'Premium Quality',     desc: 'Designed by productivity experts & graphic designers' },
]

export function BenefitsStrip() {
  return (
    <section className="section-sm w-full border-y" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="container-site">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex flex-col items-center text-center gap-2"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'rgba(201,168,76,0.1)' }}
              >
                <b.icon size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>{b.title}</p>
              <p className="text-xs leading-relaxed hidden md:block" style={{ color: 'var(--text-muted)' }}>{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────

const marqueeItems = [
  '✦ Digital Planners', '◆ Printable Planners', '❋ Budget Trackers',
  '✦ Habit Trackers', '◆ Wellness Planners', '❋ Student Planners',
  '✦ You are not overwhelmed, you are just missing an Arwign Planner',
  '◆ GoodNotes Ready', '❋ Instant Download', '✦ ADHD Planners',
  '◆ Planner Bundles', '❋ Notion Templates', '✦ Goal Trackers',
]

export function MarqueeBar() {
  const doubled = [...marqueeItems, ...marqueeItems]
  return (
    <div
      className="w-full overflow-hidden py-3 border-y"
      style={{ borderColor: 'var(--border-gold)', background: 'rgba(201,168,76,0.04)' }}
      aria-hidden="true"
    >
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className="mx-6 text-xs font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Marketing Manager',
    rating: 5,
    text: 'Arwign Planners completely transformed how I organize my week. The digital planner is beautiful, hyperlinked, and works perfectly on my iPad. I\'ve tried dozens of planner shops and nothing comes close.',
    product: 'Ultimate Daily Digital Planner',
  },
  {
    name: 'Jessica T.',
    role: 'University Student',
    rating: 5,
    text: 'The student planner helped me go from barely managing deadlines to finishing a semester ahead. The habit tracker that comes with it is pure gold. Highly recommend to every student!',
    product: 'Student Success Bundle',
  },
  {
    name: 'Amanda K.',
    role: 'Mom of 3 & Entrepreneur',
    rating: 5,
    text: 'I bought the family planner bundle and the budget planner and I can\'t believe how much time I save each week. The printable version is gorgeous and my family actually uses it on the wall!',
    product: 'Family Planner + Budget Bundle',
  },
  {
    name: 'Priya R.',
    role: 'Wellness Coach',
    rating: 5,
    text: 'My clients ask about my wellness planner every single session. The layout is intuitive, it tracks mood, water, sleep, and goals all in one place. I now recommend Arwign to all my clients.',
    product: 'Wellness & Self-Care Planner',
  },
]

export function TestimonialsSection() {
  return (
    <section className="section w-full" aria-labelledby="testimonials-heading">
      <div className="container-site">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>What Our Planners Say</p>
          <h2 id="testimonials-heading" className="font-display text-display-md mb-4" style={{ color: 'var(--text-primary)' }}>
            Loved by 50,000+ Planners
          </h2>
          <div className="divider-gold" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-7"
              itemScope
              itemType="https://schema.org/Review"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                {[...Array(t.rating)].map((_, s) => (
                  <span key={s} className="text-base" style={{ color: 'var(--gold)' }} aria-hidden="true">★</span>
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed mb-5 italic" style={{ color: 'var(--text-secondary)' }} itemProp="reviewBody">
                "{t.text}"
              </blockquote>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }} itemProp="author">{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.role}</p>
                </div>
                <span className="badge badge-gold text-[10px]">{t.product}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────

import { Lock, RotateCcw, Award, HeartHandshake } from 'lucide-react'

const trustItems = [
  { icon: Lock,         title: 'Secure Checkout',       desc: '256-bit SSL encryption on every purchase' },
  { icon: RotateCcw,    title: '30-Day Money Back',     desc: 'Not satisfied? Full refund, no questions asked' },
  { icon: Award,        title: 'Premium Quality',       desc: 'Every template is professionally designed' },
  { icon: HeartHandshake, title: 'Instant Delivery',   desc: 'Access your files immediately after payment' },
]

export function TrustSection() {
  return (
    <section className="section-sm w-full" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container-site">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {trustItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
                <item.icon size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import type { Product } from '@/types/database'

interface FeaturedProductsProps {
  products: Product[]
  title: string
  showAll?: string
}

export function FeaturedProducts({ products, title, showAll }: FeaturedProductsProps) {
  return (
    <section className="section w-full" aria-labelledby={`${title.toLowerCase().replace(/ /g, '-')}-heading`}>
      <div className="container-site">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>
              Premium Collection
            </p>
            <h2 className="font-display text-display-md" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          </div>
          {showAll && (
            <Link href={showAll} className="btn-ghost hidden sm:flex items-center gap-1 text-sm">
              View All <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} priority={i < 2} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No products yet — check back soon.</p>
          </div>
        )}

        {showAll && (
          <div className="text-center mt-10">
            <Link href={showAll} className="btn-outline sm:hidden">
              View All {title} <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────

export interface BlogPreviewPost {
  slug:     string
  title:    string
  excerpt:  string
  category: string
  readTime: number
  image:    string
}

const blogPosts: BlogPreviewPost[] = [
  {
    slug:    'best-digital-planners-for-productivity',
    title:   'Best Digital Planners for Productivity in 2025',
    excerpt: 'Discover the top digital planners for professionals, students, and entrepreneurs to organize their lives and reach their goals faster.',
    category: 'Productivity',
    readTime: 7,
    image:   'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80&fit=crop&crop=entropy',
  },
  {
    slug:    'how-to-use-a-digital-planner',
    title:   'How to Use a Digital Planner on Your iPad',
    excerpt: 'Step-by-step guide to getting started with digital planners on GoodNotes, Notability, and other iPad apps.',
    category: 'Guides',
    readTime: 5,
    image:   'https://images.unsplash.com/photo-1514782831304-632d84503f6f?w=800&q=80&fit=crop&crop=entropy',
  },
  {
    slug:    'best-adhd-planners',
    title:   'Best ADHD Planners to Stay Focused & Organized',
    excerpt: 'Our top picks for ADHD-friendly digital and printable planners with time-blocking, visual cues, and flexible layouts.',
    category: 'ADHD',
    readTime: 6,
    image:   'https://images.unsplash.com/photo-1544655152-4dc3bc4df059?w=800&q=80&fit=crop&crop=entropy',
  },
]

export function BlogPreview({ posts }: { posts?: BlogPreviewPost[] }) {
  // DB-provided posts win; fall back to the hardcoded set when absent/empty.
  const items = posts && posts.length > 0 ? posts : blogPosts
  return (
    <section className="section w-full border-t" style={{ borderColor: 'var(--border)' }} aria-labelledby="blog-preview-heading">
      <div className="container-site">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Planning Tips & Guides</p>
            <h2 id="blog-preview-heading" className="font-display text-display-md" style={{ color: 'var(--text-primary)' }}>From the Blog</h2>
          </div>
          <Link href="/blog" className="btn-ghost hidden sm:flex items-center gap-1 text-sm">
            All Articles <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card overflow-hidden"
              itemScope
              itemType="https://schema.org/Article"
            >
              <Link href={`/blog/${post.slug}`} aria-label={`Read: ${post.title}`}>
                <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover product-image"
                    loading="lazy"
                    itemProp="image"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge badge-new">{post.category}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{post.readTime} min read</span>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }} itemProp="headline">
                    {post.title}
                  </h3>
                  <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }} itemProp="description">
                    {post.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold mt-4 transition-colors hover:text-gold" style={{ color: 'var(--gold)' }}>
                    Read More <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────

export function LifestyleBanner() {
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: 440 }} aria-label="Lifestyle inspiration">
      <Image
        src="https://images.unsplash.com/photo-1517971129774-8a2b38fa128e?w=1600&q=85&fit=crop&crop=entropy"
        alt="Woman at a beautiful desk writing in her planner near a window"
        fill
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* dark-left overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(105deg, rgba(26,24,32,0.82) 0%, rgba(26,24,32,0.45) 55%, rgba(26,24,32,0.1) 100%)' }}
      />
      <div className="absolute inset-0 flex items-center">
        <div className="container-site">
          <motion.div
            initial={{ opacity: 0, x: -36 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-xl"
          >
            <p
              className="text-xs uppercase tracking-widest font-semibold mb-5"
              style={{ color: 'var(--gold-light)', letterSpacing: '0.16em' }}
            >
              Your Lifestyle Upgrade
            </p>
            <h2
              className="font-display text-white mb-5"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.75rem)', lineHeight: 1.08, letterSpacing: '-0.02em' }}
            >
              Start living your most{' '}
              <em style={{ color: 'var(--gold-light)', fontStyle: 'italic' }}>organized life</em>
            </h2>
            <p className="text-white/75 text-base leading-relaxed mb-8 max-w-md">
              Every goal you set, every habit you build, every budget you stick to — it all starts with the right planner in your hands.
            </p>
            <Link href="/shop" className="btn-primary">
              Shop All Planners <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default BenefitsStrip
