'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Download, Upload, RefreshCw, Loader2, Unplug } from 'lucide-react'

interface Row { provider: string; status: string; account_email: string | null }
interface Props {
  configured: Record<'google' | 'microsoft' | 'apple' | 'anthropic' | 'push', boolean>
  rows: Row[]
}

const PROVIDERS = [
  { key: 'google', name: 'Google Calendar', blurb: 'Two-way sync of events, invites and free/busy.', needs: 'a Google Cloud OAuth client (Calendar API + consent screen).' },
  { key: 'microsoft', name: 'Microsoft 365 / Outlook', blurb: 'Two-way sync via Microsoft Graph.', needs: 'a Microsoft Entra app registration with Calendars scopes.' },
  { key: 'apple', name: 'Apple Calendar', blurb: 'Standards-based interop through ICS import & export.', needs: null },
  { key: 'anthropic', name: 'AI assistance (Claude)', blurb: 'Natural-language prose in briefings, smarter parsing and suggestions.', needs: 'an ANTHROPIC_API_KEY.' },
  { key: 'push', name: 'Web push', blurb: 'Phone & desktop push notifications for reminders.', needs: 'a VAPID keypair (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).' },
] as const

export default function IntegrationsClient({ configured, rows: initialRows }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [syncing, setSyncing] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('connected')) setBanner({ tone: 'ok', text: `${p.get('connected')} connected. Run a sync to pull your events in.` })
    else if (p.get('error')) {
      const e = p.get('error')
      setBanner({ tone: 'err', text: e === 'not_configured' ? 'That provider isn’t configured yet — its OAuth credentials need to be added.' : `Couldn’t connect (${e}).` })
    }
  }, [])

  const rowFor = (key: string) => rows.find((r) => r.provider === key)

  const syncNow = async () => {
    setSyncing(true); setBanner(null)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const j = await res.json()
      if (res.ok) setBanner({ tone: 'ok', text: `Synced — ${j.pulled} pulled, ${j.pushed} pushed${j.deleted ? `, ${j.deleted} removed` : ''}.${j.errors?.length ? ` (${j.errors.join('; ')})` : ''}` })
      else setBanner({ tone: 'err', text: j.error ?? 'Sync failed.' })
    } catch { setBanner({ tone: 'err', text: 'Sync failed.' }) } finally { setSyncing(false) }
  }
  const disconnect = async (provider: string) => {
    await fetch(`/api/calendar/sync?provider=${provider}`, { method: 'DELETE' })
    setRows((r) => r.filter((x) => x.provider !== provider))
    setBanner({ tone: 'ok', text: `${provider} disconnected.` })
  }

  const anyConnected = rows.some((r) => (r.provider === 'google' || r.provider === 'microsoft') && r.status !== 'disconnected')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site max-w-3xl py-6">
        <div className="mb-1 flex items-center gap-3">
          <Link href="/calendar/settings" className="btn-ghost" aria-label="Back"><ArrowLeft size={18} /></Link>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Integrations</h1>
          {anyConnected && (
            <button onClick={syncNow} disabled={syncing} className="btn-primary ml-auto px-4 py-2 text-sm">
              {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Sync now
            </button>
          )}
        </div>
        <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect the tools you already use. Apple interop and ICS work today; the others switch on the moment their credentials are provisioned.
        </p>

        {banner && (
          <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: banner.tone === 'ok' ? 'rgba(110,139,122,0.12)' : 'rgba(180,102,74,0.12)', color: banner.tone === 'ok' ? '#5c7a68' : '#B4664A' }}>
            {banner.text}
          </div>
        )}

        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const isConfigured = configured[p.key]
            const row = rowFor(p.key)
            const connected = row && row.status !== 'disconnected'
            const isOAuth = p.key === 'google' || p.key === 'microsoft'
            return (
              <div key={p.key} className="flex flex-wrap items-center gap-4 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                    {p.key === 'apple' ? <Badge tone="ok">Available</Badge>
                      : connected ? <Badge tone={row!.status === 'error' ? 'pending' : 'ok'}>{row!.status === 'error' ? 'Needs attention' : 'Connected'}</Badge>
                      : isConfigured ? <Badge tone="ready">Ready to connect</Badge>
                      : <Badge tone="pending">Needs setup</Badge>}
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.blurb}</p>
                  {connected && row!.account_email && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row!.account_email}</p>}
                  {!isConfigured && p.needs && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Requires {p.needs}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {p.key === 'apple' ? (
                    <Link href="/calendar/app" className="btn-outline px-3 py-2 text-sm"><Download size={14} /> Import / export .ics</Link>
                  ) : isOAuth ? (
                    connected ? (
                      <button onClick={() => disconnect(p.key)} className="btn-outline px-3 py-2 text-sm" style={{ color: '#B4664A' }}><Unplug size={14} /> Disconnect</button>
                    ) : isConfigured ? (
                      <a href={`/api/calendar/oauth/${p.key}/start`} className="btn-primary px-4 py-2 text-sm">Connect</a>
                    ) : (
                      <button disabled className="btn-outline px-4 py-2 text-sm opacity-50" title="Awaiting operator configuration">Connect</button>
                    )
                  ) : (
                    <span className="text-sm font-medium" style={{ color: isConfigured ? '#5c7a68' : 'var(--text-muted)' }}>{isConfigured ? 'Active' : 'Awaiting keys'}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h3 className="mb-1 flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}><Upload size={16} style={{ color: 'var(--gold)' }} /> Works today, no setup</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Import any calendar as an <code>.ics</code> file and export yours to subscribe in Apple, Google or Outlook — from the
            {' '}<Link href="/calendar/app" className="font-semibold" style={{ color: 'var(--gold)' }}>calendar toolbar</Link>. Booking pages, meeting polls, reminders and the email Daily Briefing are all live.
          </p>
        </div>
      </div>
    </div>
  )
}

function Badge({ tone, children }: { tone: 'ok' | 'ready' | 'pending'; children: React.ReactNode }) {
  const map = {
    ok: { bg: 'rgba(110,139,122,0.18)', fg: '#5c7a68' },
    ready: { bg: 'rgba(var(--gold-rgb),0.16)', fg: 'var(--gold-dark)' },
    pending: { bg: 'rgba(91,107,120,0.16)', fg: 'var(--text-muted)' },
  }[tone]
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: map.bg, color: map.fg }}>{tone === 'ok' && <Check size={10} />}{children}</span>
}
