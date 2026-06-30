'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2 } from 'lucide-react'

export interface Selections {
  colour: string; size: string; motif: string; templates: string[]; tabs: string; name: string
}

function buildIdea(s: Selections) {
  const lines = [
    'Personalised notebook request:',
    `• Colourway: ${s.colour}`,
    `• Size: ${s.size}`,
    `• Cover motif: ${s.motif}`,
    `• Page templates: ${s.templates.length ? s.templates.join(', ') : '—'}`,
    `• Section tabs: ${s.tabs}`,
    `• Name / initials: ${s.name.trim() || '—'}`,
  ]
  return lines.join('\n')
}

export default function RequestModal({ open, onClose, selections }: { open: boolean; onClose: () => void; selections: Selections }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tmo = setTimeout(() => firstRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const f = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); clearTimeout(tmo) }
  }, [open, onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Please add your name'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Please add a valid email'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const idea = `${buildIdea(selections)}${note.trim() ? `\n\nNotes: ${note.trim()}` : ''}`
    setStatus('loading'); setServerError('')
    try {
      const res = await fetch('/api/notebook-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), idea, locale: 'en', honeypot }),
      })
      if (res.ok) { setStatus('success') }
      else {
        const data = await res.json().catch(() => ({}))
        setServerError(data.error?.idea?.[0] ?? data.error?.email?.[0] ?? (typeof data.error === 'string' ? data.error : '') ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch { setServerError('Network error. Please try again.'); setStatus('error') }
  }

  const fieldCls = 'w-full rounded-xl border bg-[var(--bg-card)] px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2'

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(44,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
          role="dialog" aria-modal="true" aria-label="Request your personalised notebook">
          <motion.div ref={dialogRef} initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} transition={{ duration: 0.25 }}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'var(--bg-card)', maxHeight: '92dvh' }}>
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><X size={16} /></button>

            <div className="overflow-y-auto p-7" style={{ maxHeight: '92dvh' }}>
              {status === 'success' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}><Check size={30} style={{ color: 'var(--gold)' }} /></div>
                  <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Request received ✦</h3>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Thank you — our design team will review your brief and be in touch shortly.</p>
                  <button onClick={onClose} className="btn-primary">Done</button>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>Personalise yours</h3>
                  <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Confirm your selections and we&rsquo;ll build it to order.</p>

                  {/* selections recap */}
                  <div className="rounded-2xl border p-4 mb-5 text-xs leading-relaxed" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <span><b style={{ color: 'var(--text-primary)' }}>Colour:</b> {selections.colour}</span>
                      <span><b style={{ color: 'var(--text-primary)' }}>Size:</b> {selections.size}</span>
                      <span><b style={{ color: 'var(--text-primary)' }}>Motif:</b> {selections.motif}</span>
                      <span><b style={{ color: 'var(--text-primary)' }}>Tabs:</b> {selections.tabs}</span>
                      <span><b style={{ color: 'var(--text-primary)' }}>Templates:</b> {selections.templates.join(', ') || '—'}</span>
                      <span><b style={{ color: 'var(--text-primary)' }}>Name:</b> {selections.name.trim() || '—'}</span>
                    </div>
                  </div>

                  <form onSubmit={submit} noValidate className="flex flex-col gap-3">
                    <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" tabIndex={-1} aria-hidden="true" autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} />
                    <div>
                      <label htmlFor="rq-name" className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Your name</label>
                      <input id="rq-name" ref={firstRef} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
                        className={fieldCls} style={{ borderColor: errors.name ? '#d9534f' : 'var(--border)' }} aria-invalid={!!errors.name} />
                      {errors.name && <p className="text-xs mt-1" style={{ color: '#d9534f' }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="rq-email" className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Email</label>
                      <input id="rq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                        className={fieldCls} style={{ borderColor: errors.email ? '#d9534f' : 'var(--border)' }} aria-invalid={!!errors.email} />
                      {errors.email && <p className="text-xs mt-1" style={{ color: '#d9534f' }}>{errors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="rq-note" className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Anything else? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <textarea id="rq-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Colours to match, who it's for, must-have sections…"
                        className={`${fieldCls} resize-none`} style={{ borderColor: 'var(--border)' }} />
                    </div>
                    {status === 'error' && <p className="text-xs" style={{ color: '#d9534f' }}>{serverError}</p>}
                    <button type="submit" disabled={status === 'loading'} className="btn-primary justify-center mt-1 disabled:opacity-60">
                      {status === 'loading' ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Send my request'}
                    </button>
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>No payment now — we&rsquo;ll confirm your brief and price first.</p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
