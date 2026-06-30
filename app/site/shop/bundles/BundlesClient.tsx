'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ChevronRight, ArrowRight, Sparkles } from 'lucide-react'
import type { Product } from '@/types/database'

interface Section {
  title: string
  subtitle: string
  items: Product[]
}

interface Props {
  featured: Product | null
  sections: Section[]
}

function savingsPct(p: Product) {
  if (!p.compare_price || p.compare_price <= p.price) return 0
  return Math.round(((p.compare_price - p.price) / p.compare_price) * 100)
}

function BundleCard({ bundle, index }: { bundle: Product; index: number }) {
  const pct = savingsPct(bundle)
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        href={`/shop/${bundle.slug}`}
        className="group flex flex-col h-full rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-gold hover:-translate-y-0.5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        aria-label={`Shop the ${bundle.title} collection`}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <Image
            src={bundle.thumbnail || 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'}
            alt={bundle.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)' }} />
          {pct > 0 && (
            <span
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
              style={{ background: 'var(--gold)' }}
            >
              Save {pct}%
            </span>
          )}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <span className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-jost)' }}>
              {(bundle.bundle_items?.length ?? 0) > 0 ? `${bundle.bundle_items!.length} planners included` : 'Bundle'}
            </span>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <h3
            className="font-display text-lg mb-2 leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {bundle.title.split('—')[0].trim()}
          </h3>
          <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
            {bundle.description}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                ${bundle.price.toFixed(2)}
              </span>
              {bundle.compare_price && (
                <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                  ${bundle.compare_price.toFixed(2)}
                </span>
              )}
            </div>
            <span
              className="flex items-center gap-1 text-xs font-semibold transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: 'var(--gold-dark)' }}
            >
              Shop bundle <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function BundlesClient({ featured, sections }: Props) {
  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="w-full pt-10 pb-12 border-b"
        style={{ background: 'linear-gradient(135deg, rgba(224,168,44,0.18) 0%, rgba(184,169,212,0.12) 100%)', borderColor: 'var(--border)' }}
      >
        <div className="container-site">
          <nav className="flex items-center gap-1.5 mb-6 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Shop</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>Bundles</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold-dark)', letterSpacing: '0.12em' }}>
              Curated Collections
            </p>
            <h1 className="font-display mb-4" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.08, color: 'var(--text-primary)' }}>
              Planner Bundles
            </h1>
            <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              Pick a collection built around what you're going through — calm and wellness, new motherhood,
              ADHD-friendly planning, student life, and more. Each bundle saves you up to 35% vs buying separately.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container-site py-14">

        {/* ── Featured / best value bundle ────────────────────── */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <Link
              href={`/shop/${featured.slug}`}
              className="group grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border transition-all duration-300 hover:shadow-gold"
              style={{ borderColor: 'var(--border-gold)', background: 'var(--bg-card)' }}
              aria-label={`Shop the ${featured.title} collection`}
            >
              <div className="relative" style={{ aspectRatio: '16/10' }}>
                <Image
                  src={featured.thumbnail || ''}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <span
                  className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
                  style={{ background: 'rgba(224,168,44,0.14)', color: 'var(--gold-dark)' }}
                >
                  <Sparkles size={12} /> Best Value
                </span>
                <h2 className="font-display text-2xl md:text-3xl mb-3" style={{ color: 'var(--text-primary)' }}>
                  {featured.title}
                </h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {featured.description}
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-2xl" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                    ${featured.price.toFixed(2)}
                  </span>
                  {featured.compare_price && (
                    <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                      ${featured.compare_price.toFixed(2)}
                    </span>
                  )}
                  {savingsPct(featured) > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--gold)', color: 'white' }}>
                      Save {savingsPct(featured)}%
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── Curated sections ─────────────────────────────────── */}
        {sections.map((section) => (
          <section key={section.title} className="mb-16">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
                  {section.title}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{section.subtitle}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {section.items.map((bundle, i) => (
                <BundleCard key={bundle.id} bundle={bundle} index={i} />
              ))}
            </div>
          </section>
        ))}

        {sections.length === 0 && !featured && (
          <div className="text-center py-24 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No bundles available yet</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Check back soon — new collections are on the way.</p>
          </div>
        )}
      </div>

      {/* ── SEO Content Block ─────────────────────────────────── */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site max-w-3xl mx-auto text-center">
          <div className="divider-gold mb-6" />
          <h2 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
            The Smart Way to Build Your Planning System
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Why buy one planner when you can own a complete, themed system? Our bundles pair complementary planners
            together — wellness + habit tracking, budget + bill checklists, academic + study sessions — at prices
            that make it a no-brainer. Each bundle includes every file format listed and is delivered instantly.
          </p>
        </div>
      </section>
    </div>
  )
}
