import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import ApprovalsClient from './ApprovalsClient'

export const metadata: Metadata = {
  title: 'Approvals — Agent Command Centre',
  robots: { index: false, follow: false },
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = createServiceRoleClient()
  const status   = searchParams.status ?? 'pending'

  let query = supabase
    .from('ag_approvals')
    .select('*, ag_agents(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: approvals } = await query
  const { count: pendingCount } = await supabase
    .from('ag_approvals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <ApprovalsClient
      approvals={approvals ?? []}
      pendingCount={pendingCount ?? 0}
      activeStatus={status}
    />
  )
}
