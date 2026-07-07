'use client'
import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface CartItem {
  id:        string
  title:     string
  price:     number
  quantity?: number
  slug:      string
}

interface Props {
  items: CartItem[]
  total: number
  email: string
  onEmailInvalid: () => void
}

export default function PesapalCheckout({ items, total, email, onEmailInvalid }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit() {
    if (!email.trim()) {
      onEmailInvalid()
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pesapal/submit-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ id, slug, title, price }) => ({ id, slug, title, price })),
          email: email.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.redirectUrl) {
        setError(data.error ?? 'Could not start checkout. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = data.redirectUrl
    } catch {
      setError('Network error. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border"
        style={{ background: 'rgba(20,60,150,0.05)', borderColor: 'rgba(20,60,150,0.2)' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#143C96' }}
        >
          <CreditCard size={18} color="white" />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
            Visa / Mastercard
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Processed securely by PesaPal — you&apos;ll be redirected to pay.
          </p>
        </div>
      </div>

      {error && <p className="text-xs mb-3" style={{ color: '#dc3545' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full justify-center text-sm"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Redirecting…</>
        ) : (
          <><CreditCard size={15} /> Pay ${total.toFixed(2)} by Card</>
        )}
      </button>
    </div>
  )
}
