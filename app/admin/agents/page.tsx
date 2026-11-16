import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CommandCentreClient from './CommandCentreClient'

export const metadata: Metadata = {
  title: 'Agent Command Centre — Admin',
  robots: { index: false, follow: false },
}

async function getData() {
  const supabase = createServiceRoleClient()

  const [
    { data: globalConfig },
    { data: agents },
    { count: pendingApprovals },
    { data: recentRuns },
    { data: integrations },
  ] = await Promise.all([
    supabase.from('ag_global_config').select('*').single(),
    supabase.from('ag_agents').select('*').order('phase').order('key'),
    supabase.from('ag_approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('ag_runs')
      .select('id, agent_key, trigger, started_at, finished_at, status, cost_usd, error')
      .order('started_at', { ascending: false })
      .limit(20),
    supabase.from('ag_integrations').select('*').order('platform'),
  ])

  return {
    globalConfig:      globalConfig ?? { all_agents_paused: false },
    agents:            agents ?? [],
    pendingApprovals:  pendingApprovals ?? 0,
    recentRuns:        recentRuns ?? [],
    integrations:      integrations ?? [],
  }
}

export default async function AgentsPage() {
  const data = await getData()
  return <CommandCentreClient {...data} />
}
