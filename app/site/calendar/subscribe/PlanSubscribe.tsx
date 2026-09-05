'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Check, Loader2, ArrowLeft, Mail, Lock, User, Sparkles, Users } from 'lucide-react'

export interface PlanConfig {
  plan: 'plus' | 'teams'
  name: string
  price: string      // e.g. "$9.99"
  period: string     // e.g. "per month"
  tagline: string
  intro: string
  benefits: string[]
}

const ICON = { plus: Sparkles, teams: Users } as const

export default function PlanSubscribe({ config }: { config: PlanConfig }) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const PlanIcon = ICON[config.plan]
  const nextUrl = `/calendar/subscribe/${config.plan}`

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setSubmitting(true); setError(null)
    const supabase = createClient()
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        toast.success(`Welcome back! Setting up ${config.name}…`)
        router.push('/calendar/app'); router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            data: { full_name: fullName.trim(), intended_plan: config.plan },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          },
        })
        if (error) throw error
        if (data.session) { toast.success(`Account created! Setting up ${config.name}…`); router.push('/calendar/app'); router.refresh() }
        else setCheckEmail(true)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site py-10 lg:py-16">
        <Link href="/calendar" className="mb-8 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> Back to Arwign Calendar
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:gap-12 items-start">
          {/* ── Plan summary + benefits ── */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest"
              style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)', color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>
              <PlanIcon size={13} /> {config.name}
            </span>
            <h1 className="font-display font-semibold mt-5 mb-2" style={{ fontSize: 'clamp(2.2rem,5vw,3.25rem)', color: 'var(--text-primary)' }}>
              Subscribe to {config.name}
            </h1>
            <p className="text-lg mb-6 max-w-xl" style={{ color: 'var(--text-secondary)' }}>{config.intro}</p>

            <div className="mb-8 flex items-baseline gap-2">
              <span className="font-display font-semibold" style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{config.price}</span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{config.period}</span>
            </div>

            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              What you get with {config.name}
            </h2>
            <ul className="space-y-3">
              {config.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}>
                    <Check size={12} style={{ color: 'var(--gold)' }} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Auth card (sign up / log in) ── */}
          <div className="rounded-2xl border p-6 lg:p-7 lg:sticky lg:top-24 shadow-glass-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {checkEmail ? (
              <div className="py-6 text-center">
                <div className="mb-3 text-4xl">📩</div>
                <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Confirm your email</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  We’ve sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, and you’ll come right back here to finish subscribing to {config.name}.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 grid grid-cols-2 rounded-xl border p-1" style={{ borderColor: 'var(--border)' }}>
                  {(['signup', 'signin'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => { setMode(m); setError(null) }}
                      className="rounded-lg py-2 text-sm font-semibold transition-colors"
                      style={mode === m ? { background: 'var(--gold)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                      {m === 'signup' ? 'Create account' : 'Log in'}
                    </button>
                  ))}
                </div>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'signup' ? `Create your account to start ${config.name}.` : `Log in to add ${config.name} to your account.`}
                </p>

                <form onSubmit={submit} className="space-y-3">
                  {mode === 'signup' && (
                    <Field icon={<User size={15} />}><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" autoComplete="name" className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></Field>
                  )}
                  <Field icon={<Mail size={15} />}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></Field>
                  <Field icon={<Lock size={15} />}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Create a password' : 'Password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></Field>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : (mode === 'signup' ? `Create account & subscribe` : `Log in & subscribe`)}
                  </button>
                </form>

                <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {config.price} {config.period} · cancel anytime. By continuing you agree to our{' '}
                  <Link href="/terms" style={{ color: 'var(--gold)' }}>Terms</Link>.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      {children}
    </div>
  )
}
