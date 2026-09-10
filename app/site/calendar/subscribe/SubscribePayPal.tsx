'use client'
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

declare global { interface Window { paypal?: any } }

const PLAN_ID: Record<'plus' | 'teams', string | undefined> = {
  plus: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PLUS_ID,
  teams: process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID,
}

// Renders the PayPal recurring-subscription button for a plan. On approval the
// server verifies the subscription and activates the plan, then onPaid() fires.
export default function SubscribePayPal({ plan, onPaid }: { plan: 'plus' | 'teams'; onPaid: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)
  const uid = useRef<string | undefined>(undefined)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    const planId = PLAN_ID[plan]
    if (!clientId) { setErr('PayPal is not available right now.'); return }
    if (!planId) { setErr('This plan isn’t available for subscription yet.'); return }
    let cancelled = false
    ;(async () => { const { data: { user } } = await createClient().auth.getUser(); uid.current = user?.id })()

    function render() {
      if (cancelled || !window.paypal?.Buttons || !ref.current || rendered.current) return
      rendered.current = true
      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe', height: 44 },
        createSubscription: async (_d: unknown, actions: any) => {
          // custom_id binds the subscription to this account and the server
          // now requires it, so resolve the id before creating (the initial
          // async fetch may not have landed yet on a fast click).
          if (!uid.current) {
            const { data: { user } } = await createClient().auth.getUser()
            uid.current = user?.id
          }
          if (!uid.current) {
            setErr('Please sign in again before subscribing.')
            throw new Error('not authenticated')
          }
          return actions.subscription.create({
            plan_id: planId,
            custom_id: uid.current,
            application_context: {
              brand_name: 'Arwign Planners',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'SUBSCRIBE_NOW',
            },
          })
        },
        onApprove: async (data: { subscriptionID?: string }) => {
          setBusy(true)
          try {
            const res = await fetch('/api/calendar/subscribe/record', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionID: data.subscriptionID, plan }),
            })
            const out = await res.json()
            if (res.ok && out.ok) { onPaid(); return }
            setErr(out.error ?? 'Could not activate your subscription.')
          } catch {
            setErr('Network error while activating. If you were charged, contact support.')
          }
          setBusy(false)
        },
        onError: (e: unknown) => { console.error('[paypal-subs]', e); setErr((p) => p || 'Something went wrong with PayPal. Please try again.') },
      }).render(ref.current)
    }

    if (window.paypal?.Buttons) { render() }
    else {
      const id = 'paypal-sdk-subs'
      let s = document.getElementById(id) as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.id = id
        s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&components=buttons`
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
      {busy && <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}><Loader2 size={14} className="animate-spin" /> Activating your subscription…</p>}
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  )
}
