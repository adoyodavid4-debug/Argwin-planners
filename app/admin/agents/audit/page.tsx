import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Audit Log — Agent Command Centre',
  robots: { index: false, follow: false },
}

export default async function AuditLogPage() {
  const supabase = createServiceRoleClient()

  const { data: logs } = await supabase
    .from('ag_audit_log')
    .select('id, agent_key, action, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Audit Log</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Every agent action and admin decision, in order.
        </p>
      </div>

      {!logs || logs.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>No entries yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Agent actions and approval decisions will be recorded here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Time', 'Agent', 'Action', 'Detail'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {log.agent_key ?? 'admin'}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {log.action}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {log.detail ? JSON.stringify(log.detail) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
