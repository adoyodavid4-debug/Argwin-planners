'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
type FormData = z.infer<typeof schema>

interface Props {
  source?: string
  className?: string
}

export default function NewsletterForm({ source = 'footer', className = '' }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: FormData) => {
    setServerError('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
  }

  // ── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${className}`} role="status" aria-live="polite"
        style={{ background: 'rgba(var(--gold-rgb),0.10)', borderColor: 'rgba(var(--gold-rgb),0.35)' }}>
        <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gold)' }}>
          <CheckCircle size={18} color="#fff" />
        </span>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>You&rsquo;re in — check your inbox ✦</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Your free planning resources are on the way.</p>
        </div>
      </div>
    )
  }

  const err = errors.email?.message || serverError

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={className} noValidate>
      {/* Aligned input + button unit */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
        <div className="flex-1">
          <label htmlFor="nl-email" className="sr-only">Email address</label>
          <input
            id="nl-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            className="input-field w-full"
            aria-invalid={!!err}
            aria-describedby={err ? 'nl-error' : undefined}
            {...register('email')}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary whitespace-nowrap justify-center disabled:opacity-70"
          aria-label="Subscribe to the newsletter"
        >
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" /> Joining…</>
          ) : (
            <>Get free resources <ArrowRight size={15} /></>
          )}
        </button>
      </div>
      {/* Reserved space so validation never shifts layout */}
      <div className="min-h-[1.25rem] mt-1.5" aria-live="polite">
        {err && (
          <p id="nl-error" role="alert" className="text-xs inline-flex items-center gap-1" style={{ color: '#d9534f' }}>
            <AlertCircle size={12} /> {err}
          </p>
        )}
      </div>
    </form>
  )
}
