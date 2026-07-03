'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'

interface CartItem {
  id:        string
  title:     string
  price:     number
  quantity?: number
  slug:      string
}

interface Props {
  items:     CartItem[]
  total:     number
  onClose:   () => void
  onSuccess: (orderId?: string) => void
}

type Phase = 'idle' | 'waiting' | 'success' | 'error'

// ── KES rate from env (public, safe to expose — it's just a display hint)
// We read it server-side too; here it's just for the live preview.
const KES_RATE = 130

export default function MpesaCheckout({ items, total, onClose, onSuccess }: Props) {
  const [phone,   setPhone]   = useState('254')
  const [email,   setEmail]   = useState('')
  const [phase,   setPhase]   = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState('')
  const [amountKes, setAmountKes] = useState(Math.round(total * KES_RATE))

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const checkoutIdRef = useRef<string>('')
  const orderIdRef    = useRef<string>('')

  // Clear polling interval on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  function stopPolling() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  async function pollStatus() {
    try {
      const res  = await fetch(
        `/api/mpesa/status?checkoutRequestId=${checkoutIdRef.current}&orderId=${orderIdRef.current}`
      )
      const data = await res.json()

      if (data.status === 'completed') {
        stopPolling()
        setReceipt(data.receipt ?? '')
        setPhase('success')
      } else if (data.status === 'cancelled') {
        stopPolling()
        setMessage(data.resultDesc ?? 'Payment was cancelled. Please try again.')
        setPhase('error')
      }
      // else still 'pending' — keep polling
    } catch {
      // Network hiccup — silently keep polling
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhase('waiting')
    setMessage('')

    try {
      const res  = await fetch('/api/mpesa/stkpush', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, email, items }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setMessage(data.error ?? 'Could not send M-Pesa request. Check your phone number.')
        setPhase('error')
        return
      }

      checkoutIdRef.current = data.checkoutRequestId
      orderIdRef.current    = data.orderId
      setAmountKes(data.amountKes ?? amountKes)

      // Start polling every 3 s — give up after 90 s
      let ticks = 0
      intervalRef.current = setInterval(async () => {
        ticks++
        await pollStatus()
        if (ticks >= 30) {
          stopPolling()
          setMessage('Payment timed out. If you completed the PIN, wait a moment and refresh — your order is saved.')
          setPhase('error')
        }
      }, 3000)
    } catch {
      setMessage('Network error. Check your connection and try again.')
      setPhase('error')
    }
  }

  function handleSuccess() {
    onSuccess(orderIdRef.current || undefined)
    onClose()
  }

  const amountPreview = Math.round(total * KES_RATE)

  return (
    <div className="flex flex-col gap-5 w-full">
      <AnimatePresence mode="wait">

        {/* ── Idle: phone entry form ───────────────────────── */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -8 }}
          >
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft size={12} /> Back to cart
            </button>

            {/* M-Pesa brand header */}
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl border"
              style={{ background: 'rgba(0,150,50,0.07)', borderColor: 'rgba(0,150,50,0.25)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                style={{ background: '#00A651' }}
              >
                M
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  Lipa Na M-Pesa
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  You will receive a PIN prompt on your phone
                </p>
              </div>
            </div>

            {/* Amount display */}
            <div className="flex justify-between items-center mb-5 px-1">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Amount to pay</span>
              <div className="text-right">
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  KES {amountPreview.toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ≈ ${total.toFixed(2)} USD
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  M-Pesa phone number
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="254712345678"
                    className="input-field pl-9 text-sm w-full"
                    style={{ fontFamily: 'var(--font-jost)' }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Format: 254 7XX XXX XXX or 07XX XXX XXX
                </p>
              </div>

              {/* Email for receipt */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Email (for download link)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field text-sm w-full"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center text-sm mt-1"
                style={{ background: '#00A651', borderColor: '#00A651' }}
              >
                Send M-Pesa Request
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Waiting: check your phone ────────────────────── */}
        {phase === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{   opacity: 0 }}
            className="text-center py-6"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,166,81,0.1)' }}
            >
              <Loader2 size={28} className="animate-spin" style={{ color: '#00A651' }} />
            </div>
            <p className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Check your phone
            </p>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Enter your M-Pesa PIN to pay
            </p>
            <p className="font-bold text-xl mb-4" style={{ color: '#00A651' }}>
              KES {amountKes.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Waiting for confirmation · this can take up to 30 s
            </p>
          </motion.div>
        )}

        {/* ── Success ──────────────────────────────────────── */}
        {phase === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,166,81,0.1)' }}
            >
              <CheckCircle2 size={32} style={{ color: '#00A651' }} />
            </div>
            <p className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Payment confirmed!
            </p>
            {receipt && (
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Receipt: <span className="font-mono">{receipt}</span>
              </p>
            )}
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your download link has been sent to {email}
            </p>
            <button className="btn-primary w-full justify-center" onClick={handleSuccess}>
              Done
            </button>
          </motion.div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(220,53,69,0.08)' }}
            >
              <XCircle size={32} style={{ color: '#dc3545' }} />
            </div>
            <p className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Payment failed
            </p>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
            <button
              className="btn-outline w-full justify-center"
              onClick={() => setPhase('idle')}
            >
              Try again
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
