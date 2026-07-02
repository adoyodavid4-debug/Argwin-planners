'use client'
// Features shared by both products: compatibility badges, feature-highlight
// grid and social proof. Presentational only.
import { motion } from 'framer-motion'
import { Link2, Layers, LayoutGrid, Type, Maximize, Star, Check } from 'lucide-react'
import {
  COMPATIBILITY, FEATURES, REVIEWS_PLACEHOLDER, RATING_AVG, RATING_COUNT, type Feature,
} from './data'

const ICONS: Record<Feature['icon'], typeof Link2> = {
  Link2, Layers, LayoutGrid, Type, Maximize,
}

export function CompatibilityBadges() {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest font-semibold mb-3 text-center" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
        Works beautifully in
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-2.5" aria-label="Compatible apps and formats">
        {COMPATIBILITY.map((name) => (
          <li
            key={name}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border"
            style={{ borderColor: 'var(--border-gold)', background: 'rgba(201,168,76,0.06)', color: 'var(--text-primary)' }}
          >
            <Check size={13} style={{ color: 'var(--gold)' }} aria-hidden="true" />
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FeatureGrid() {
  return (
    <div>
      <h3 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
        What's inside every notebook
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => {
          const Icon = ICONS[f.icon]
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl border p-5"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(201,168,76,0.1)' }}>
                <Icon size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < Math.round(value) ? 'fill-current' : ''}
          style={{ color: i < Math.round(value) ? 'var(--gold)' : 'var(--border)' }}
        />
      ))}
    </span>
  )
}

export function SocialProof() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Stars value={RATING_AVG} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {RATING_AVG.toFixed(1)} out of 5
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ({RATING_COUNT.toLocaleString()} reviews)
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REVIEWS_PLACEHOLDER.map((r) => (
          <figure
            key={r.name}
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
          >
            <div className="mb-2">
              <Stars value={r.rating} />
              <span className="sr-only">{r.rating} out of 5 stars</span>
            </div>
            <blockquote className="text-sm leading-relaxed mb-3 italic" style={{ color: 'var(--text-secondary)' }}>
              “{r.text}”
            </blockquote>
            <figcaption className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {r.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
