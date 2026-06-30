'use client'
// Keyboard-navigable FAQ accordion. Native <button> headers give us focus,
// Enter/Space and screen-reader support for free; we add aria-expanded/controls.
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FAQS } from './data'

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div>
      <h3 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
        Frequently asked
      </h3>
      <ul className="space-y-2.5">
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <li
              key={faq.q}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              <h4 className="m-0">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-header-${i}`}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
                >
                  <span className="text-sm font-semibold">{faq.q}</span>
                  <ChevronDown
                    size={17}
                    className="flex-shrink-0 transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', color: 'var(--gold)' }}
                  />
                </button>
              </h4>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-header-${i}`}
                hidden={!isOpen}
                className="px-4 pb-4 -mt-1"
              >
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {faq.a}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
