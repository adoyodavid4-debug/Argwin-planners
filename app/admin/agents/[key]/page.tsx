import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import AgentDetailClient from './AgentDetailClient'

export const metadata: Metadata = {
  title: 'Agent — Command Centre',
  robots: { index: false, follow: false },
}

const VALID_KEYS = [
  'sales','email','pinterest','listing','video',
  'ads','seo','support','bundles','trends','analyst',
]

export default async function AgentDetailPage({ params }: { params: { key: string } }) {
  if (!VALID_KEYS.includes(params.key)) notFound()

  const supabase = createServiceRoleClient()

  const [
    { data: agent },
    { data: runs },
    { data: prompts },
    { data: approvals },
    { data: kpis },
  ] = await Promise.all([
    supabase.from('ag_agents').select('*').eq('key', params.key).single(),
    supabase
      .from('ag_runs')
      .select('id, trigger, started_at, finished_at, status, summary, tokens_in, tokens_out, cost_usd, error, prompt_version')
      .eq('agent_key', params.key)
      .order('started_at', { ascending: false })
      .limit(10),
    supabase
      .from('ag_prompts')
      .select('id, version, content, created_at')
      .eq('agent_key', params.key)
      .order('version', { ascending: false }),
    supabase
      .from('ag_approvals')
      .select('id, action_type, title, status, created_at, decided_at')
      .eq('agent_key', params.key)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('ag_kpi_snapshots')
      .select('date, channel, metric, value')
      .eq('agent_key', params.key)
      .order('date', { ascending: false })
      .limit(30),
  ])

  if (!agent) notFound()

  return (
    <AgentDetailClient
      agent={agent}
      runs={runs ?? []}
      prompts={prompts ?? []}
      approvals={approvals ?? []}
      kpis={kpis ?? []}
    />
  )
}
