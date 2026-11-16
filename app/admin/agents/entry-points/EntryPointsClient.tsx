'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Planner { id: string; title: string; slug: string }

interface Props {
  planners: Planner[]
  waNumber: string
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copied`)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <code
        className="flex-1 text-xs px-2 py-1.5 rounded-lg truncate"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
      >
        {value}
      </code>
      <button onClick={copy} className="p-1.5 rounded-lg flex-shrink-0 hover:bg-black/5" aria-label={`Copy ${label}`}>
        {copied ? <Check size={13} style={{ color: '#6E7E66' }} /> : <Copy size={13} style={{ color: 'var(--text-muted)' }} />}
      </button>
    </div>
  )
}

export default function EntryPointsClient({ planners, waNumber }: Props) {
  const [selected, setSelected] = useState<Planner | null>(planners[0] ?? null)

  if (!selected) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Entry Points</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active planners found.</p>
      </div>
    )
  }

  const code        = `AP-${selected.slug}`
  const prefill     = `Hi! I'm interested in the ${selected.title} [${code}]`
  const waLink      = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(prefill)}`
    : `(set WHATSAPP_DISPLAY_NUMBER env var) wa.me/?text=${encodeURIComponent(prefill)}`
  const productUrl  = `https://www.arwignplanners.com/products/${selected.slug}`
  const utmLink     = `${productUrl}?utm_source=whatsapp&utm_medium=sales_agent&utm_campaign=${selected.slug}`
  const igKeyword   = `PLANNER-${selected.slug.toUpperCase().slice(0, 20)}`
  const qrUrl       = waNumber
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`https://wa.me/${waNumber}?text=${encodeURIComponent(prefill)}`)}`
    : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Entry Points</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Per-planner links, codes and prefilled text for ads, posts and the website. All consent-based.
        </p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Planner</label>
        <select
          value={selected.id}
          onChange={e => setSelected(planners.find(p => p.id === e.target.value) ?? null)}
          className="text-sm rounded-xl px-3 py-2 border outline-none"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {planners.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 p-6 rounded-2xl border space-y-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{selected.title}</h2>
          <CopyRow label="Planner code"    value={`[${code}]`} />
          <CopyRow label="wa.me link"      value={waLink} />
          <CopyRow label="Ad prefill text" value={prefill} />
          <CopyRow label="IG keyword"      value={igKeyword} />
          <CopyRow label="UTM product URL" value={utmLink} />
          <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
            The webhook parses <code>[{code}]</code> from the first message to link the lead to this planner.
            The IG keyword allows <strong>one</strong> private reply per comment within 7 days — the conversation
            continues only if the person replies.
          </p>
        </div>

        <div
          className="p-6 rounded-2xl border flex flex-col items-center justify-center gap-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>QR code</h2>
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt={`WhatsApp QR for ${selected.title}`} width={180} height={180} className="rounded-xl" />
          ) : (
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Set <code>WHATSAPP_DISPLAY_NUMBER</code> in Vercel to generate the QR code.
            </p>
          )}
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Scans open WhatsApp with the prefilled planner message.
          </p>
        </div>
      </div>
    </div>
  )
}
