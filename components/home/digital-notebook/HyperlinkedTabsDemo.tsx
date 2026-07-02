'use client'
// A small, decorative demo of the notebook's hyperlinked tab navigation
// "jumping" between sections. Auto-advances, but honours reduced-motion and
// lets users click a tab themselves.
import { useEffect, useRef, useState } from 'react'
import { DEMO_TABS } from './data'

export default function HyperlinkedTabsDemo() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.current = mq.matches
  }, [])

  useEffect(() => {
    if (paused || reduced.current) return
    const t = setInterval(() => setActive((a) => (a + 1) % DEMO_TABS.length), 1900)
    return () => clearInterval(t)
  }, [paused])

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>
        Tap a tab, land on the page
      </p>
      <h3 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
        Hyperlinked navigation
      </h3>

      {/* Tabs (decorative demo — not the page's primary nav) */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Notebook section tabs demo">
        {DEMO_TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setActive(i); setPaused(true) }}
            aria-pressed={i === active}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300"
            style={
              i === active
                ? { background: 'var(--gold)', color: '#fff', boxShadow: '0 2px 10px rgba(201,168,76,0.35)' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* "Page" the active tab jumps to */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        aria-live="polite"
      >
        <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {DEMO_TABS[active]}
          </span>
        </div>
        <div className="p-4 space-y-2" key={active}>
          {[100, 82, 68].map((w, r) => (
            <span
              key={r}
              className="block h-2 rounded-full animate-fade-in"
              style={{ width: `${w}%`, background: 'var(--border)' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
