'use client'
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

declare global { interface Window { paypal?: any } }

// Renders the PayPal button for a monthly calendar plan. On a completed capture,
// the server activates the plan and we call onPaid().
export default function SubscribePayPal({ plan, onPaid }: { plan: 'plus' | 'teams'; onPaid: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)
  const [err, setErr] = useState('')
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) { setErr('PayPal is not available right now. Please try again later.'); return }
    let cancelled = false

    function render() {
      if (cancelled || !window.paypal || !ref.current || rendered.current) return
      rendered.current = true
      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 44 },
        createOrder: async () => {
          setErr('')
          const res = await fetch('/api/calendar/subscribe/create-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }),
          })
          const data = await res.json()
          if (!res.ok || !data.id) { setErr(data.error ?? 'Could not start checkout.'); throw new Error('create-order') }
          return data.id
        },
        onApprove: async (data: { orderID: string }) => {
          setCapturing(true)
          try {
            const res = await fetch('/api/calendar/subscribe/capture', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: data.orderID, plan }),
            })
            const out = await res.json()
            if (res.ok && out.ok) { onPaid(); return }
            setErr(out.error ?? 'Payment could not be completed. Please try again.')
          } catch {
            setErr('Network error while completing your payment. If you were charged, contact support.')
          }
          setCapturing(false)
        },
        onError: (e: unknown) => { console.error('[paypal]', e); setErr((p) => p || 'Something went wrong with PayPal. Please try again.') },
      }).render(ref.current)
    }

    if (window.paypal) { render() }
    else {
      const id = 'paypal-sdk'
      let s = document.getElementById(id) as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.id = id
        s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`
        s.onerror = () => { if (!cancelled) setErr('Could not load PayPal. Please try again.') }
        document.body.appendChild(s)
      }
      s.addEventListener('load', render)
      return () => { cancelled = true; s?.removeEventListener('load', render) }
    }
    return () => { cancelled = true }
  }, [plan, onPaid])

  return (
    <div>
      <div ref={ref} />
      {capturing && <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}><Loader2 size={14} className="animate-spin" /> Completing payment…</p>}
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  )
}
