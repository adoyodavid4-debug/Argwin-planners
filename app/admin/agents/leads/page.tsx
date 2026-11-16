import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Leads — Agent Command Centre',
  robots: { index: false, follow: false },
}

const STATUS_COLOUR: Record<string, string> = {
  new: '#C9A84C', active: '#6E7E66', won: '#7B6FAE', dormant: 'var(--text-muted)', lost: '#C9847C',
}

export default async function LeadsPage() {
  const supabase = createServiceRoleClient()

  const [{ data: leads }, { count: total }, { count: won }] = await Promise.all([
    supabase
      .from('sa_leads')
      .select('id, name, market, source, status, created_at, last_contact_at, sa_identities(channel), sa_consents(channel, revoked_at)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('sa_leads').select('*', { count: 'exact', head: true }),
    supabase.from('sa_leads').select('*', { count: 'exact', head: true }).eq('status', 'won'),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Leads</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {total ?? 0} leads · {won ?? 0} won · every lead here opted in or messaged first — no cold lists.
        </p>
      </div>

      {!leads || leads.length === 0 ? (
        <div className="p-12 rounded-2xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>No leads yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Leads arrive from WhatsApp/Instagram/Messenger messages, website opt-in buttons and checkout opt-ins.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Lead', 'Market', 'Source', 'Channels', 'Consent', 'Status', 'Created', 'Last contact'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const identities = (lead.sa_identities as Array<{ channel: string }> | null) ?? []
                const consents   = ((lead.sa_consents as Array<{ channel: string; revoked_at: string | null }> | null) ?? [])
                  .filter(c => !c.revoked_at)
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {lead.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 uppercase" style={{ color: 'var(--text-muted)' }}>{lead.market}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{lead.source ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {identities.map(i => i.channel).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: consents.length ? '#6E7E66' : 'var(--text-muted)' }}>
                      {consents.length ? consents.map(c => c.channel).join(', ') : 'window only'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full capitalize"
                        style={{
                          background: `${STATUS_COLOUR[lead.status] ?? '#888'}20`,
                          color: STATUS_COLOUR[lead.status] ?? 'var(--text-muted)',
                        }}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {lead.last_contact_at
                        ? new Date(lead.last_contact_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
