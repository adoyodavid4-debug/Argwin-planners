'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: FormData) => {
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
      toast.success('Welcome to Arwign Planners! ✦')
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm font-semibold" style={{ color: 'var(--gold)' }}>
        <CheckCircle size={18} />
        You're in! Check your email for a welcome gift 🎁
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`flex flex-col sm:flex-row gap-3 max-w-md mx-auto ${className}`} noValidate>
      <div className="flex-1">
        <input
          type="email"
          placeholder="your@email.com"
          className="input-field"
          aria-label="Email address for newsletter"
          {...register('email')}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-xs mt-1 text-red-500" role="alert">{errors.email.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary whitespace-nowrap"
        aria-label="Subscribe to newsletter"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>Get Free Resources <ArrowRight size={15} /></>
        )}
      </button>
    </form>
  )
}
