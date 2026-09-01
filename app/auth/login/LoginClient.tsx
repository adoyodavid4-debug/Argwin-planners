'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight, Shield, Sparkles, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function LoginClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || '/admin/dashboard'
  const isAdminArea  = redirectTo.startsWith('/admin')

  const [mode,       setMode]       = useState<'signin' | 'signup'>('signin')
  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next)
    setErrorMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setErrorMsg('Email and password are required.'); return }

    setSubmitting(true)
    setErrorMsg(null)
    const supabase = createClient()

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        toast.success('Welcome back!')
        router.push(redirectTo)
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) throw error
        if (data.session) {
          toast.success('Account created!')
          router.push(redirectTo)
          router.refresh()
        } else {
          toast.success('Account created — check your email to confirm, then sign in.')
          switchMode('signin')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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

          {isAdminArea && (
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase"
              style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.14)', letterSpacing: '0.12em' }}>
              <Shield size={11} /> Admin area
            </p>
          )}

          <h1 className="font-display mt-4" style={{ fontSize: '1.9rem', lineHeight: 1.15, color: 'var(--text-primary)' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'signin'
              ? 'Sign in to continue to Arwign Planners'
              : 'Join Arwign Planners in less than a minute'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border overflow-hidden shadow-[0_24px_60px_-24px_rgba(44,42,53,0.25)]"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Gold accent rule */}
          <div aria-hidden className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, var(--gold) 0%, #C4A538 50%, var(--gold) 100%)' }} />

          {/* Mode tabs */}
          <div className="grid grid-cols-2 border-b" style={{ borderColor: 'var(--border)' }}>
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="py-3.5 text-sm font-semibold transition-colors"
                style={{
                  color: mode === m ? 'var(--gold-dark)' : 'var(--text-muted)',
                  background: mode === m ? 'rgba(var(--gold-rgb),0.10)' : 'transparent',
                  boxShadow: mode === m ? 'inset 0 -2px 0 var(--gold)' : 'none',
                  fontFamily: 'var(--font-jost)',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  {label('Full Name')}
                  <div className="relative">
                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="input-field pl-11"
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                {label('Email')}
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-11"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                {label('Password')}
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    className="input-field pl-11 pr-11"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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
                  : (<>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>)}
              </button>
            </form>

            {/* Trust row */}
            <div className="mt-6 pt-5 border-t flex items-center justify-center gap-x-5 gap-y-2 flex-wrap"
              style={{ borderColor: 'var(--border)' }}>
              <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <Shield size={12} style={{ color: 'var(--gold)' }} /> Secure sign in
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <Star size={12} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} /> 4.9 rated shop
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <Sparkles size={12} style={{ color: 'var(--gold)' }} /> Instant downloads
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:underline">← Back to store</Link>
        </p>
      </div>
    </div>
  )
}
