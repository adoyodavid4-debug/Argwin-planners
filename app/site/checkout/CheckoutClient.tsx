'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Lock, Mail, ShoppingBag, Trash2 } from 'lucide-react'
import { useCartStore, type CartItem } from '@/lib/store'
import MpesaCheckout from '@/components/checkout/MpesaCheckout'
import PesapalCheckout from '@/components/checkout/PesapalCheckout'

type Method = 'pesapal' | 'paypal' | 'mpesa'

declare global {
  interface Window { paypal?: any }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CheckoutClient() {
  const router = useRouter()
  const { items, removeItem, total, clearCart } = useCartStore()

  const [mounted,     setMounted]     = useState(false)
  const [method,      setMethod]      = useState<Method>('pesapal')
  const [email,       setEmail]       = useState('')
  const [emailError,  setEmailError]  = useState('')
  const [paypalReady, setPaypalReady] = useState(false)
  const [paypalError, setPaypalError] = useState('')
  const [capturing,   setCapturing]   = useState(false)

  // Refs so the PayPal SDK callbacks always read the latest values
  const emailRef = useRef(email)
  const itemsRef = useRef<CartItem[]>(items)
  useEffect(() => { emailRef.current = email }, [email])
  useEffect(() => { itemsRef.current = items }, [items])

  const paypalContainerRef = useRef<HTMLDivElement>(null)
  const buttonsRenderedRef = useRef(false)

  // zustand-persist hydration guard
  useEffect(() => { setMounted(true) }, [])

  function validateEmail(value: string): boolean {
    if (!EMAIL_RE.test(value.trim())) {
      setEmailError('Please enter a valid email address — your downloads are sent there.')
      return false
    }
    setEmailError('')
    return true
  }

  // ── PayPal buttons ────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || method !== 'paypal' || items.length === 0) return

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) {
      setPaypalError('PayPal is not available right now. Please pay by card instead.')
      return
    }

    let cancelled = false

    function renderButtons() {
      if (cancelled || !window.paypal || !paypalContainerRef.current || buttonsRenderedRef.current) return
      buttonsRenderedRef.current = true
      setPaypalReady(true)

      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 44 },

        createOrder: async () => {
          setPaypalError('')
          const currentEmail = emailRef.current.trim()
          if (!EMAIL_RE.test(currentEmail)) {
            setEmailError('Please enter a valid email address — your downloads are sent there.')
            throw new Error('invalid email')
          }
          const res = await fetch('/api/paypal/create-order', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: itemsRef.current.map(({ id, slug, title, price }) => ({ id, slug, title, price })),
              email: currentEmail,
            }),
          })
          const data = await res.json()
          if (!res.ok || !data.id) {
            setPaypalError(data.error ?? 'Could not start PayPal checkout.')
            throw new Error(data.error ?? 'create-order failed')
          }
          return data.id
        },

        onApprove: async (data: { orderID: string }) => {
          setCapturing(true)
          try {
            const res = await fetch('/api/paypal/capture', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ orderID: data.orderID }),
            })
            const out = await res.json()
            if (res.ok && out.orderId) {
              clearCart()
              router.push(`/checkout/success?order=${out.orderId}`)
              return
            }
            setPaypalError(out.error ?? 'Payment could not be completed. Please try again.')
          } catch {
            setPaypalError('Network error while completing your payment. If you were charged, contact support.')
          }
          setCapturing(false)
        },

        onError: (err: unknown) => {
          console.error('[paypal]', err)
          setPaypalError((prev) => prev || 'Something went wrong with PayPal. Please try again or pay by card.')
        },
      }).render(paypalContainerRef.current)
    }

    if (window.paypal) {
      renderButtons()
    } else {
      const scriptId = 'paypal-sdk'
      let script = document.getElementById(scriptId) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id  = scriptId
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`
        script.onerror = () => { if (!cancelled) setPaypalError('Could not load PayPal. Please try again or pay by card.') }
        document.body.appendChild(script)
      }
      script.addEventListener('load', renderButtons)
      return () => { cancelled = true; script?.removeEventListener('load', renderButtons) }
    }

    return () => { cancelled = true }
  }, [mounted, method, items.length, clearCart, router])

  // Re-allow the buttons to render if the user leaves and returns to the tab
  useEffect(() => {
    if (method !== 'paypal') {
      buttonsRenderedRef.current = false
      setPaypalReady(false)
    }
  }, [method])

  // ── Render ────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="container-site py-24 flex justify-center">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    )
  }

  if (items.length === 0 && !capturing) {
    return (
      <div className="container-site py-24">
        <div className="max-w-md mx-auto text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <ShoppingBag size={26} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
            Your cart is empty
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Add a planner to your cart and come back to complete your order.
          </p>
          <Link href="/shop" className="btn-primary text-sm">
            Browse the Shop
          </Link>
        </div>
      </div>
    )
  }

  const methods: { key: Method; label: string }[] = [
    { key: 'pesapal', label: 'Card' },
    { key: 'paypal',  label: 'PayPal' },
    { key: 'mpesa',   label: 'M-Pesa' },
  ]

  return (
    <div className="container-site py-12 md:py-16">
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
        Secure Checkout
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px] max-w-5xl">
        {/* ── Payment column ─────────────────────────────────── */}
        <div className="order-2 lg:order-1">
          {/* Email */}
          <div className="rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Email address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value) }}
                onBlur={(e) => { if (e.target.value) validateEmail(e.target.value) }}
                placeholder="you@example.com"
                className="input-field pl-9 text-sm w-full"
                autoComplete="email"
              />
            </div>
            {emailError ? (
              <p className="text-xs mt-2" style={{ color: '#dc3545' }}>{emailError}</p>
            ) : (
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Your receipt and download links will be sent here.
              </p>
            )}
          </div>

          {/* Payment method tabs */}
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Payment method
            </p>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {methods.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className="py-2.5 rounded-xl text-sm font-semibold border transition-all"
                  style={{
                    borderColor: method === m.key ? 'var(--gold)' : 'var(--border)',
                    background:  method === m.key ? 'rgba(var(--gold-rgb),0.08)' : 'transparent',
                    color:       method === m.key ? 'var(--gold)' : 'var(--text-secondary)',
                    fontFamily:  'var(--font-jost)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Card (PesaPal — Visa / Mastercard) */}
            {method === 'pesapal' && (
              <PesapalCheckout
                items={items}
                total={total()}
                email={email}
                onEmailInvalid={() => validateEmail(email)}
              />
            )}

            {/* PayPal */}
            {method === 'paypal' && (
              <div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Pay with your PayPal balance or a linked card.
                </p>
                {paypalError && <p className="text-xs mb-3" style={{ color: '#dc3545' }}>{paypalError}</p>}
                {capturing ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--gold)' }} />
                    Completing your payment…
                  </div>
                ) : (
                  <>
                    {!paypalReady && !paypalError && (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--gold)' }} />
                        Loading PayPal…
                      </div>
                    )}
                    <div ref={paypalContainerRef} />
                  </>
                )}
              </div>
            )}

            {/* M-Pesa */}
            {method === 'mpesa' && (
              <MpesaCheckout
                items={items}
                total={total()}
                onClose={() => setMethod('pesapal')}
                onSuccess={(orderId) => {
                  clearCart()
                  router.push(orderId ? `/checkout/success?order=${orderId}` : '/shop')
                }}
              />
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
              <Lock size={11} />
              256-bit SSL encrypted · Instant download after payment
            </div>
          </div>
        </div>

        {/* ── Order summary ──────────────────────────────────── */}
        <div className="order-1 lg:order-2">
          <div className="rounded-2xl border p-6 lg:sticky lg:top-24" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Order Summary ({items.length} item{items.length !== 1 ? 's' : ''})
            </h2>

            <div className="space-y-3 mb-5">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="relative w-12 h-15 flex-shrink-0 rounded-lg overflow-hidden" style={{ height: 60 }}>
                    <Image
                      src={item.thumbnail || '/placeholder-planner.jpg'}
                      alt={item.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Instant Digital Download</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                      ${item.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-md transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label={`Remove ${item.title} from cart`}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>${total().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--gold)' }}>${total().toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
