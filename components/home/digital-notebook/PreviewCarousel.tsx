'use client'
// Interactive preview gallery of interior spreads — prev/next, thumbnail strip,
// keyboard navigation and lazy-loaded images. Shared by both products.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SPREADS } from './data'

interface Props {
  /** Cover-tint accent reflecting the selected Ready-Made colourway. */
  accent?: string
  /** Label for the colourway, surfaced on the cover slide. */
  accentLabel?: string
}

export default function PreviewCarousel({ accent, accentLabel }: Props) {
  const [index, setIndex] = useState(0)
  const count = SPREADS.length
  const thumbsRef = useRef<HTMLDivElement>(null)

  const go = useCallback((next: number) => {
    setIndex((next + count) % count)
  }, [count])

  // Keep the active thumbnail in view as the slide changes.
  useEffect(() => {
    const strip = thumbsRef.current
    if (!strip) return
    const active = strip.querySelector<HTMLElement>(`[data-thumb="${index}"]`)
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [index])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(index - 1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
  }

  const current = SPREADS[index]

  return (
    <div
      className="flex flex-col gap-3"
      role="group"
      aria-roledescription="carousel"
      aria-label="Notebook interior preview"
      onKeyDown={onKeyDown}
    >
      {/* Stage */}
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', aspectRatio: '4/3' }}
      >
        {SPREADS.map((s, i) => (
          <figure
            key={s.src}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}
            aria-hidden={i !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${s.caption}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.alt}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
            {/* Cover slide reflects the chosen colourway */}
            {s.cover && accent && (
              <span
                aria-hidden="true"
                className="absolute inset-0 mix-blend-multiply transition-colors duration-300"
                style={{ background: accent, opacity: 0.32 }}
              />
            )}
            <figcaption
              className="absolute bottom-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(44,42,53,0.78)', color: '#fff', letterSpacing: '0.04em' }}
            >
              {s.cover && accentLabel ? `${accentLabel} · ${s.caption}` : s.caption}
            </figcaption>
          </figure>
        ))}

        {/* Prev / Next */}
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous spread"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(8px)', color: 'var(--text-primary)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next spread"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(8px)', color: 'var(--text-primary)' }}
        >
          <ChevronRight size={18} />
        </button>

        {/* Live region for screen readers */}
        <span className="sr-only" aria-live="polite">
          Spread {index + 1} of {count}: {current.caption}
        </span>
      </div>

      {/* Thumbnail strip */}
      <div
        ref={thumbsRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
        role="group"
        aria-label="Choose a spread to preview"
      >
        {SPREADS.map((s, i) => (
          <button
            key={s.src}
            data-thumb={i}
            type="button"
            aria-current={i === index}
            aria-label={`Show ${s.caption}`}
            onClick={() => go(i)}
            className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all"
            style={{
              outline: i === index ? '2px solid var(--gold)' : '1px solid var(--border)',
              outlineOffset: i === index ? '1px' : '0',
              opacity: i === index ? 1 : 0.7,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" draggable={false} />
          </button>
        ))}
      </div>
    </div>
  )
}
