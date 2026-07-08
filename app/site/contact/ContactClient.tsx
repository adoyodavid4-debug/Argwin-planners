'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail, MessageSquare, Send, Loader2, CheckCircle2, Instagram, Youtube, Clock } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactClient() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status,  setStatus]  = useState<Status>('idle')
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) return setError('Please enter your name.')
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.')
    if (message.trim().length < 10) return setError('Please add a little more detail to your message (10+ characters).')

    setError('')
    setStatus('submitting')

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    name.trim(),
          email:   email.trim(),
          subject: subject.trim() || undefined,
          message: message.trim(),
          honeypot,
        }),
      })

      if (res.ok) {
        setStatus('success')
        return
      }

      const data = await res.json().catch(() => ({}))
      const fieldError = data.error?.message?.[0] ?? data.error?.email?.[0] ?? data.error?.name?.[0]
      setError(typeof data.error === 'string' ? data.error : fieldError ?? 'Something went wrong. Please try again.')
      setStatus('error')
    } catch {
      setError('Network error. Check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div className="container-site py-12 md:py-16">
      <nav className="flex items-center gap-1.5 mb-6 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)' }}>Contact</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
        Get in touch
      </h1>
      <p className="text-sm mb-10 max-w-lg" style={{ color: 'var(--text-secondary)' }}>
        Question about an order, a product, or an idea you&apos;d like to share? We read every message and reply personally.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] max-w-5xl">
        {/* ── Form ──────────────────────────────────────────── */}
        <div className="rounded-2xl border p-6 md:p-8" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          {status === 'success' ? (
            <div className="text-center py-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(var(--gold-rgb),0.12)' }}
              >
                <CheckCircle2 size={30} style={{ color: 'var(--gold)' }} />
              </div>
              <p className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                Message sent
              </p>
              <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Thanks for reaching out — we&apos;ve got your message and will reply to <strong>{email}</strong> as soon as we can, usually within 1–2 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Honeypot — hidden from real users */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: 'absolute', left: '-9999px' }}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                    Your name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    className="input-field text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="input-field text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  Subject <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="input-field text-sm w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  Message
                </label>
                <textarea
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can help…"
                  className="input-field text-sm w-full resize-none"
                />
              </div>

              {error && <p className="text-xs" style={{ color: '#dc3545' }}>{error}</p>}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn-primary text-sm"
              >
                {status === 'submitting' ? (
                  <><Loader2 size={15} className="animate-spin" /> Sending…</>
                ) : (
                  <><Send size={15} /> Send message</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* ── Contact info ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                <Mail size={16} style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Email us</p>
                <a href="mailto:info@arwignplanners.com" className="text-sm font-semibold hover:underline" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  info@arwignplanners.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                <Clock size={16} style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Response time</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  Within 1–2 business days
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <p className="text-xs uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Follow along</p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/arwignplanners"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 hover:border-gold hover:text-gold"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                aria-label="Follow Arwign Planners on Instagram"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://youtube.com/@arwignplanners"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 hover:border-gold hover:text-gold"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                aria-label="Follow Arwign Planners on YouTube"
              >
                <Youtube size={16} />
              </a>
            </div>
          </div>

          <div className="rounded-2xl border p-6 flex items-start gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <MessageSquare size={16} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Looking for order help or a download link? Check your confirmation email first — every order includes direct download links and a receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
