import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Funnel Metrics — Admin', robots: { index: false, follow: false } }

async function getMetrics() {
  try {
    const supabase = createServiceRoleClient()
    const [
      { count: totalOptins },
      { count: confirmed },
      { count: unsubscribed },
      { count: bounced },
      { data: eventCounts },
    ] = await Promise.all([
      supabase.from('subscribers').select('*', { count: 'exact', head: true }),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'bounced'),
      supabase.from('email_events').select('type').limit(5000),
    ])

    const confirmRate = totalOptins ? ((confirmed ?? 0) / totalOptins * 100).toFixed(1) : '0'
    const unsubRate   = confirmed   ? ((unsubscribed ?? 0) / (confirmed ?? 1) * 100).toFixed(1) : '0'

    const eventSummary: Record<string, number> = {}
    for (const e of (eventCounts ?? [])) {
      eventSummary[e.type] = (eventSummary[e.type] ?? 0) + 1
    }

    return { totalOptins: totalOptins ?? 0, confirmed: confirmed ?? 0, confirmRate, unsubscribed: unsubscribed ?? 0, unsubRate, bounced: bounced ?? 0, eventSummary, migrated: true }
  } catch {
    return { totalOptins: 0, confirmed: 0, confirmRate: '0', unsubscribed: 0, unsubRate: '0', bounced: 0, eventSummary: {}, migrated: false }
  }
}

export default async function FunnelMetricsPage() {
  const m = await getMetrics()

  if (!m.migrated) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Funnel Metrics</h1>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          <strong>Migration pending.</strong> Apply <code>004_funnel_schema.sql</code> and <code>005_nurture_rpc.sql</code> in the Supabase SQL editor to enable the funnel tables.
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total opt-ins', value: m.totalOptins },
    { label: 'Confirmed', value: m.confirmed },
    { label: 'Confirm rate', value: `${m.confirmRate}%` },
    { label: 'Unsubscribed', value: m.unsubscribed },
    { label: 'Unsub rate', value: `${m.unsubRate}%` },
    { label: 'Bounced', value: m.bounced },
  ]

  const events = [
    { label: 'Sent', value: m.eventSummary['sent'] ?? 0 },
    { label: 'Delivered', value: m.eventSummary['delivered'] ?? 0 },
    { label: 'Opened', value: m.eventSummary['opened'] ?? 0 },
    { label: 'Clicked', value: m.eventSummary['clicked'] ?? 0 },
    { label: 'Bounced', value: m.eventSummary['bounced'] ?? 0 },
    { label: 'Complained', value: m.eventSummary['complaint'] ?? 0 },
  ]

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Funnel Metrics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm text-[var(--text-muted)]">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Email events</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {events.map((e) => (
          <div key={e.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="text-sm text-[var(--text-muted)]">{e.label}</p>
            <p className="text-2xl font-bold mt-1">{e.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
