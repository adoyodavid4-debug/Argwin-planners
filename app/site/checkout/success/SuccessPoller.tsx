'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Re-runs the server component every 3s (up to ~60s) while the payment
// webhook finishes processing the order.
export default function SuccessPoller() {
  const router = useRouter()
  const [timedOut, setTimedOut] = useState(false)
  const ticksRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      ticksRef.current++
      if (ticksRef.current >= 20) {
        clearInterval(interval)
        setTimedOut(true)
        return
      }
      router.refresh()
    }, 3000)
    return () => clearInterval(interval)
  }, [router])

  if (timedOut) {
    return (
      <div className="text-center">
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          This is taking longer than expected
        </p>
        <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          Your payment went through — the order confirmation and download links will arrive
          in your inbox shortly. If nothing arrives within 15 minutes, contact{' '}
          <a href="mailto:support@arwignplanners.com" style={{ color: 'var(--gold)' }}>support@arwignplanners.com</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <Loader2 size={28} className="animate-spin mx-auto mb-4" style={{ color: 'var(--gold)' }} />
      <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
        Finalising your order…
      </p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Your payment was received. This usually takes just a few seconds.
      </p>
    </div>
  )
}
