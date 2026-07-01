'use client'
import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Gift, Check, Sparkles, BellRing } from 'lucide-react'

export default function HomeNewsletter() {
  const reduce = useReducedMotion()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || status === 'loading') return
    setStatus('loading')
    try {
      const r = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, source: 'homepage' }) })
      setStatus(r.ok ? 'done' : 'error')
    } catch { setStatus('error') }
  }

  return (
    <section className="py-16 lg:py-20 border-t newsletter-gradient" style={{ borderColor: 'var(--border)' }} aria-label="Newsletter">
      <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="container-site max-w-xl mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--gold-rgb),0.16)' }}><Gift size={26} style={{ color: 'var(--gold)' }} /></div>
        <h2 className="font-display mb-3" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}>Get a free sample + new-drop alerts</h2>
        <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>Join the list for a free planner page, early access to new designs, and members-only offers. No spam, ever.</p>
        {status === 'done' ? (
          <p className="inline-flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--gold-dark)' }}><Check size={18} /> You&rsquo;re in — check your inbox for your free sample ✦</p>
        ) : (
          <>
            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="input-field flex-1" aria-label="Email address" />
              <button type="submit" disabled={status === 'loading'} className="btn-primary whitespace-nowrap disabled:opacity-60">{status === 'loading' ? 'Joining…' : 'Get my free sample'}</button>
            </form>
            <div className="flex items-center justify-center gap-5 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="inline-flex items-center gap-1.5"><Sparkles size={12} style={{ color: 'var(--gold)' }} /> Free sample page</span>
              <span className="inline-flex items-center gap-1.5"><BellRing size={12} style={{ color: 'var(--gold)' }} /> New-drop alerts</span>
            </div>
            {status === 'error' && <p className="text-xs mt-3" style={{ color: '#d9534f' }}>Something went wrong — please try again.</p>}
          </>
        )}
      </motion.div>
    </section>
  )
}
