'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type Locale = 'en' | 'fr'

interface Props {
  locale?: Locale
  className?: string
}

const schema = z.object({
  name:     z.string().min(1, 'Required').max(120),
  email:    z.string().email(),
  idea:     z.string().min(10, 'Tell us a bit more (10+ characters)').max(2000),
  honeypot: z.string().max(0),
})

type FormValues = z.infer<typeof schema>

const copy: Record<Locale, {
  heading: string; sub: string; namePlaceholder: string; emailPlaceholder: string
  ideaPlaceholder: string; cta: string; success: string
}> = {
  en: {
    heading:          'Have an idea for a personalized notebook?',
    sub:               "Tell us what you'd love to see — a layout, a theme, a niche we haven't covered yet. We read every submission.",
    namePlaceholder:   'Your name',
    emailPlaceholder:  'Your email address',
    ideaPlaceholder:   'Describe your idea: who it\'s for, what it should include, any style preferences…',
    cta:               'Submit my idea →',
    success:           "Thank you! We've received your idea and will be in touch if we'd like to bring it to life.",
  },
  fr: {
    heading:          'Une idée de cahier personnalisé ?',
    sub:               "Dites-nous ce que vous aimeriez voir — une mise en page, un thème, un créneau que nous n'avons pas encore couvert. Nous lisons chaque message.",
    namePlaceholder:   'Votre nom',
    emailPlaceholder:  'Votre adresse email',
    ideaPlaceholder:   'Décrivez votre idée : pour qui, ce qu\'elle devrait inclure, vos préférences de style…',
    cta:               'Envoyer mon idée →',
    success:           "Merci ! Nous avons reçu votre idée et reviendrons vers vous si nous souhaitons la concrétiser.",
  },
}

export function NotebookRequestForm({ locale = 'en', className }: Props) {
  const t = copy[locale]
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', idea: '', honeypot: '' },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError('')
    const res = await fetch('/api/notebook-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, locale }),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setServerError(data.error?.idea?.[0] ?? data.error?.email?.[0] ?? data.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center ${className ?? ''}`}>
        <div className="text-4xl mb-3">💡</div>
        <p className="font-semibold text-[var(--text-primary)]">{t.success}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 ${className ?? ''}`}>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.heading}</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t.sub}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Honeypot — hidden from real users */}
        <input {...register('honeypot')} type="text" name="website" tabIndex={-1}
          aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1">
            <input
              {...register('name')}
              type="text"
              placeholder={t.namePlaceholder}
              autoComplete="name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input,white)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="flex-1">
            <input
              {...register('email')}
              type="email"
              placeholder={t.emailPlaceholder}
              autoComplete="email"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input,white)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div className="mb-3">
          <textarea
            {...register('idea')}
            rows={4}
            placeholder={t.ideaPlaceholder}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input,white)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] resize-none"
          />
          {errors.idea && <p className="text-xs text-red-500 mt-1">{errors.idea.message}</p>}
        </div>

        {serverError && (
          <p className="text-xs text-red-500 mb-2">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8963e] disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? '...' : t.cta}
        </button>
      </form>
    </div>
  )
}
