'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordClient() {
  const [email,      setEmail]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent,       setSent]       = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setErrorMsg('Please enter your email address.'); return }

    setSubmitting(true)
    setErrorMsg(null)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
      style={{ background: 'var(--bg-secondary)' }}>

      {/* Soft decorative washes */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(160,131,14,0.14), transparent)' }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(168,181,160,0.16), transparent)' }} />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Arwign Planners"
              width={526}
              height={92}
              className="h-11 w-auto object-contain"
              priority
            />
          </Link>

          <h1 className="font-display mt-4" style={{ fontSize: '1.9rem', lineHeight: 1.15, color: 'var(--text-primary)' }}>
            Reset your password
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border overflow-hidden shadow-[0_24px_60px_-24px_rgba(44,42,53,0.25)]"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Gold accent rule */}
          <div aria-hidden className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, var(--gold) 0%, #C4A538 50%, var(--gold) 100%)' }} />

          <div className="p-7">
            {sent ? (
              <div className="text-center py-2">
                <CheckCircle2 size={36} className="mx-auto mb-3" style={{ color: 'var(--gold-dark)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Check your email
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  If an account exists for <span className="font-semibold">{email.trim()}</span>, a
                  password-reset link is on its way. The link expires after a short while, so use it soon.
                </p>
                <Link href="/auth/login" className="inline-block text-sm font-semibold mt-5 hover:underline"
                  style={{ color: 'var(--gold-dark)', fontFamily: 'var(--font-jost)' }}>
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-1.5"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.12em', fontFamily: 'var(--font-jost)' }}>
                    Email
                  </p>
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input-field"
                      style={{ paddingRight: '2.75rem' }}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p role="alert" className="rounded-lg px-3.5 py-2.5 text-sm"
                    style={{ background: 'rgba(201,123,90,0.12)', color: '#9C4A2E', border: '1px solid rgba(201,123,90,0.35)' }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full justify-center"
                  style={{ padding: '0.85rem 1.5rem' }}
                >
                  {submitting
                    ? <Loader2 size={16} className="animate-spin" />
                    : (<>Send reset link <ArrowRight size={15} /></>)}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          <Link href="/auth/login" className="hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
