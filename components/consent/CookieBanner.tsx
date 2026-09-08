'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'
import { useConsent, type ConsentState } from './ConsentProvider'

function Toggle({ checked, disabled, onChange, label }: {
  checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ background: checked ? 'var(--gold)' : 'var(--border)' }}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function Row({ title, desc, checked, disabled, onChange }: {
  title: string; desc: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <Toggle checked={checked} disabled={disabled} onChange={onChange} label={title} />
    </div>
  )
}

export default function CookieBanner() {
  const { ready, decided, bannerOpen, consent, save, acceptAll, rejectAll, closeBanner } = useConsent()
  const [showPrefs, setShowPrefs] = useState(false)
  const [prefs, setPrefs] = useState<ConsentState>(consent)

  const visible = ready && (!decided || bannerOpen)

  // Seed the toggles from the current decision whenever the banner (re)appears.
  useEffect(() => {
    if (visible) {
      setPrefs(consent)
      setShowPrefs(bannerOpen && decided) // reopened to change settings → go straight to detail
    }
  }, [visible, bannerOpen, decided, consent])

  if (!visible) return null

  const dismissable = decided // only allow closing if a choice already exists

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl border p-5 shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-gold, var(--border))', boxShadow: '0 12px 48px rgba(0,0,0,0.22)' }}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}>
            <Cookie size={18} style={{ color: 'var(--gold)' }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>Your privacy choices</h2>
              {dismissable && (
                <button onClick={closeBanner} aria-label="Close" className="rounded-lg p-1" style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We use essential cookies to run the cart and checkout. With your permission we also use
              analytics and marketing cookies (Google Analytics 4 and the Meta Pixel) to understand and
              improve the site. They stay off until you choose. See our{' '}
              <Link href="/privacy" className="underline" style={{ color: 'var(--gold-dark, var(--gold))' }}>Privacy Policy</Link>.
            </p>

            {showPrefs && (
              <div className="mt-3 divide-y rounded-xl border px-4" style={{ borderColor: 'var(--border)' }}>
                <Row title="Essential" desc="Required for the cart, checkout, sign-in and remembering this choice. Always on." checked disabled />
                <Row
                  title="Analytics"
                  desc="Google Analytics 4 — anonymous usage stats that help us improve the store."
                  checked={prefs.analytics}
                  onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                />
                <Row
                  title="Marketing"
                  desc="Meta Pixel — measures ad performance and helps us reach people like you."
                  checked={prefs.marketing}
                  onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                />
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                onClick={acceptAll}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--gold)' }}
              >
                Accept all
              </button>
              <button
                onClick={rejectAll}
                className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Reject all
              </button>
              {showPrefs ? (
                <button
                  onClick={() => save(prefs)}
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium sm:ml-auto"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Save choices
                </button>
              ) : (
                <button
                  onClick={() => setShowPrefs(true)}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium sm:ml-auto"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Manage preferences
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
