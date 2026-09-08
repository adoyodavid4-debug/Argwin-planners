'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordClient() {
  const router = useRouter()

  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  // The emailed link goes through /auth/callback, which sets the session cookie
  // before landing here. No session means the link expired or was already used.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setErrorMsg('Passwords do not match.'); return }

    setSubmitting(true)
    setErrorMsg(null)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated — you are signed in.')
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const passwordInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    autoComplete: string,
  ) => (
    <div className="relative">
      <input
        type={showPass ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        style={{ paddingRight: '2.75rem' }}
        autoComplete={autoComplete}
        minLength={6}
        required
      />
      <button
        type="button"
        onClick={() => setShowPass((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
        aria-label={showPass ? 'Hide password' : 'Show password'}
      >
        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )

  const label = (text: string) => (
    <p className="text-[11px] font-semibold uppercase mb-1.5"
      style={{ color: 'var(--text-muted)', letterSpacing: '0.12em', fontFamily: 'var(--font-jost)' }}>
      {text}
    </p>
  )

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
            Set a new password
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Choose a new password for your account.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border overflow-hidden shadow-[0_24px_60px_-24px_rgba(44,42,53,0.25)]"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Gold accent rule */}
          <div aria-hidden className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, var(--gold) 0%, #C4A538 50%, var(--gold) 100%)' }} />

          <div className="p-7">
            {hasSession === false ? (
              <div className="text-center py-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  This reset link is invalid or has expired
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Request a new one and try again.
                </p>
                <Link href="/auth/forgot-password" className="inline-block text-sm font-semibold mt-5 hover:underline"
                  style={{ color: 'var(--gold-dark)', fontFamily: 'var(--font-jost)' }}>
                  Request a new link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  {label('New Password')}
                  {passwordInput(password, setPassword, 'At least 6 characters', 'new-password')}
                </div>

                <div>
                  {label('Confirm Password')}
                  {passwordInput(confirm, setConfirm, 'Repeat your new password', 'new-password')}
                </div>

                {errorMsg && (
                  <p role="alert" className="rounded-lg px-3.5 py-2.5 text-sm"
                    style={{ background: 'rgba(201,123,90,0.12)', color: '#9C4A2E', border: '1px solid rgba(201,123,90,0.35)' }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || hasSession === null}
                  className="btn-primary w-full justify-center"
                  style={{ padding: '0.85rem 1.5rem' }}
                >
                  {submitting
                    ? <Loader2 size={16} className="animate-spin" />
                    : (<>Update password <ArrowRight size={15} /></>)}
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
