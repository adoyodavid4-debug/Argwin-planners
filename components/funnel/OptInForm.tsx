'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type Variant = 'inline' | 'footer' | 'exit-intent'
type Locale = 'en' | 'fr'

interface Props {
  locale?: Locale
  variant?: Variant
  leadMagnetId?: string
  magnetTitle?: string
  className?: string
}

const schema = z.object({
  email:       z.string().email(),
  consent:     z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
  honeypot:    z.string().max(0),
})

type FormValues = z.infer<typeof schema>

const copy: Record<Locale, {
  heading: string; sub: string; placeholder: string; cta: string;
  consent: string; success: string; privacy: string
}> = {
  en: {
    heading:     'Get your free planner',
    sub:         'Join thousands of planners who start here.',
    placeholder: 'Your email address',
    cta:         'Send me the free download →',
    consent:     'I agree to receive emails from Arwign Planners. I can unsubscribe at any time.',
    success:     'Check your inbox! We sent a confirmation link.',
    privacy:     'No spam, ever. Unsubscribe any time.',
  },
  fr: {
    heading:     'Obtenez votre agenda gratuit',
    sub:         'Rejoignez des milliers de personnes qui commencent ici.',
    placeholder: 'Votre adresse email',
    cta:         'M\'envoyer le téléchargement gratuit →',
    consent:     'J\'accepte de recevoir des emails d\'Arwign Planners. Je peux me désabonner à tout moment.',
    success:     'Vérifiez vos emails ! Nous avons envoyé un lien de confirmation.',
    privacy:     'Aucun spam. Désabonnement à tout moment.',
  },
}

export function OptInForm({ locale = 'en', variant = 'inline', leadMagnetId, magnetTitle, className }: Props) {
  const t = copy[locale]
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', consent: undefined as unknown as true, honeypot: '' },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError('')
    const utm: Record<string, string> = {}
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
        const v = sp.get(k); if (v) utm[k] = v
      })
    }

    const res = await fetch('/api/optin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: values.email,
        locale,
        lead_magnet_id: leadMagnetId,
        utm,
        consent_text: t.consent,
        honeypot: values.honeypot,
      }),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setServerError(data.error?.email?.[0] ?? data.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center ${className ?? ''}`}>
        <div className="text-4xl mb-3">📬</div>
        <p className="font-semibold text-[var(--text-primary)]">{t.success}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 ${className ?? ''}`}>
      {variant !== 'footer' && (
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {magnetTitle ?? t.heading}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t.sub}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Honeypot — hidden from real users */}
        <input {...register('honeypot')} type="text" name="website" tabIndex={-1}
          aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            {...register('email')}
            type="email"
            placeholder={t.placeholder}
            autoComplete="email"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input,white)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8963e] disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {isSubmitting ? '...' : t.cta}
          </button>
        </div>

        {errors.email && (
          <p className="text-xs text-red-500 mb-2">{errors.email.message}</p>
        )}

        <label className="flex items-start gap-2 cursor-pointer">
          <input {...register('consent')} type="checkbox" value="true"
            className="mt-0.5 accent-[#C9A84C]" />
          <span className="text-xs text-[var(--text-muted)]">{t.consent}</span>
        </label>
        {errors.consent && (
          <p className="text-xs text-red-500 mt-1">{errors.consent.message}</p>
        )}

        {serverError && (
          <p className="text-xs text-red-500 mt-2">{serverError}</p>
        )}

        <p className="text-[11px] text-[var(--text-muted)] mt-3 opacity-70">{t.privacy}</p>
      </form>
    </div>
  )
}
