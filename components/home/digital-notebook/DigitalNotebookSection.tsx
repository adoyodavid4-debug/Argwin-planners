'use client'
// Homepage Digital Notebooks showcase — two products (Ready-Made & Personalised)
// presented side by side behind an accessible tabbed switch, inside a shared
// visual frame. Self-contained: lives entirely under components/home/digital-notebook.
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PreviewCarousel from './PreviewCarousel'
import ReadyMadePanel from './ReadyMadePanel'
import PersonalisedPanel from './PersonalisedPanel'
import HyperlinkedTabsDemo from './HyperlinkedTabsDemo'
import FaqAccordion from './FaqAccordion'
import { CompatibilityBadges, FeatureGrid, SocialProof } from './SharedShowcase'
import { SECTION_ID, SIZES, COLOURWAYS } from './data'

type TabId = 'ready' | 'custom'

const TABS: { id: TabId; label: string }[] = [
  { id: 'ready',  label: 'Ready-Made' },
  { id: 'custom', label: 'Personalised' },
]

export default function DigitalNotebookSection() {
  const [tab, setTab] = useState<TabId>('ready') // default to Ready-Made
  const [size, setSize] = useState(SIZES[0])
  const [colour, setColour] = useState(COLOURWAYS[0])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const activeIndex = TABS.findIndex((t) => t.id === tab)

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    let next = activeIndex
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (activeIndex + 1) % TABS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (activeIndex - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    else return
    e.preventDefault()
    setTab(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <section
      id={SECTION_ID}
      aria-labelledby="digital-notebooks-heading"
      className="section w-full scroll-mt-28"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="container-site">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>
            Digital Notebooks
          </p>
          <h2 id="digital-notebooks-heading" className="font-display text-display-md mb-4" style={{ color: 'var(--text-primary)' }}>
            Two ways to get your notebook
          </h2>
          <p className="max-w-xl mx-auto text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Download a polished <strong>ready-made</strong> notebook in seconds, or have one <strong>personalised</strong> and built just for you. Same beautiful craft — your choice of how to begin.
          </p>
          <div className="divider-gold mt-5" />
        </div>

        {/* Tabbed switch */}
        <div
          role="tablist"
          aria-label="Choose a notebook type"
          onKeyDown={onTabKeyDown}
          className="mx-auto mb-8 flex w-full max-w-xs p-1 rounded-full border"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          {TABS.map((t, i) => {
            const selected = t.id === tab
            return (
              <button
                key={t.id}
                ref={(el) => { tabRefs.current[i] = el }}
                role="tab"
                id={`dn-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="dn-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
                className="relative flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors"
                style={{ color: selected ? '#fff' : 'var(--text-secondary)' }}
              >
                {selected && (
                  <motion.span
                    layoutId="dn-tab-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'var(--gold)', boxShadow: '0 4px 16px rgba(201,168,76,0.4)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Shared visual frame: preview + active product panel */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--glass-shadow)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Preview */}
            <div className="p-5 sm:p-7 lg:border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <PreviewCarousel
                accent={tab === 'ready' ? colour.accent : undefined}
                accentLabel={tab === 'ready' ? colour.label : undefined}
              />
            </div>

            {/* Product panel */}
            <div
              id="dn-panel"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={`dn-tab-${tab}`}
              className="p-6 sm:p-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  {tab === 'ready' ? (
                    <ReadyMadePanel
                      size={size}
                      colour={colour}
                      onSizeChange={setSize}
                      onColourChange={setColour}
                    />
                  ) : (
                    <PersonalisedPanel />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Compatibility — shared, inside the frame */}
          <div className="px-6 sm:px-8 py-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <CompatibilityBadges />
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-12">
          <FeatureGrid />
        </div>

        {/* Hyperlinked-tabs demo + FAQ */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          <HyperlinkedTabsDemo />
          <FaqAccordion />
        </div>

        {/* Social proof */}
        <div className="mt-12">
          <SocialProof />
        </div>
      </div>
    </section>
  )
}
