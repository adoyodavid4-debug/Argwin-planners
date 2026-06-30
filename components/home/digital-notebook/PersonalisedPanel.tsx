'use client'
// Personalised (custom-request) product panel. The "Request" CTA opens a
// lightweight modal that REUSES the existing NotebookRequestForm — which
// already handles the Supabase insert + Resend email + spam defences +
// validation + success/error/loading states. We only trigger it here.
import { useEffect, useRef, useState } from 'react'
import { Sparkles, Clock, X, PenLine } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { NotebookRequestForm } from '@/components/notebooks/NotebookRequestForm'

const CAN_PERSONALISE = [
  'Cover motif & artwork',
  'Name or initials',
  'Colourway',
  'Size (A4 / US Letter / A5)',
  'Page templates',
  'Section tabs',
]

function RequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(26,24,32,0.55)', backdropFilter: 'blur(4px)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-modal-title"
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--glass-shadow)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h3 id="request-modal-title" className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
                Request your notebook
              </h3>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="btn-ghost"
                aria-label="Close request form"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 pt-3">
              <NotebookRequestForm locale="en" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function PersonalisedPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="badge badge-new text-[10px]">Personalised</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--lavender)' }}>
          <PenLine size={12} /> Built to order
        </span>
      </div>

      <h3 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
        Personalised Notebook
      </h3>
      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
        Tell us your idea and our design team will build a notebook around exactly what you need — yours alone.
      </p>

      {/* Customisation summary */}
      <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        What you can personalise
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-6">
        {CAN_PERSONALISE.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Sparkles size={14} style={{ color: 'var(--gold)' }} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      {/* Expectation note */}
      <div
        className="flex items-start gap-2.5 rounded-xl border px-4 py-3 mb-5"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <Clock size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} aria-hidden="true" />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          This is a <strong>build-to-order</strong> notebook, not an instant download. We review every idea and typically reply within 2–3 working days to talk through your design.
        </p>
      </div>

      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full justify-center">
        <PenLine size={16} /> Request a personalised notebook
      </button>

      <RequestModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
