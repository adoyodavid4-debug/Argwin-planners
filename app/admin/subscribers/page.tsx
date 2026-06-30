import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SubscribersClient from './SubscribersClient'

export const metadata: Metadata = { title: 'Subscribers — Admin', robots: { index: false, follow: false } }

export default async function SubscribersPage() {
  const supabase = createServiceRoleClient()
  const { data, count, error } = await supabase
    .from('subscribers')
    .select('id, email, status, locale, confirmed_at, created_at, tags, lead_magnets(title_i18n)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Subscribers</h1>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          <strong>Migration pending.</strong> Apply <code>004_funnel_schema.sql</code> in the Supabase SQL editor to enable this feature.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Subscribers <span className="text-base font-normal text-[var(--text-muted)]">({count ?? 0})</span></h1>
      <SubscribersClient initialData={(data ?? []) as unknown as Parameters<typeof SubscribersClient>[0]['initialData']} totalCount={count ?? 0} />
    </div>
  )
}
