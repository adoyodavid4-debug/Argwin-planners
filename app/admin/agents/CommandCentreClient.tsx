'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Bot, CheckSquare, AlertTriangle, Zap, ZapOff, Play, Square,
  DollarSign, Clock, CheckCircle, XCircle, Minus, ExternalLink,
  TrendingUp, Users, Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { AgentRecord, IntegrationRecord } from '@/lib/agents/types'

interface Props {
  globalConfig:     { all_agents_paused: boolean }
  agents:           AgentRecord[]
  pendingApprovals: number
  recentRuns:       Array<{
    id: number; agent_key: string; trigger: string; started_at: string
    finished_at: string | null; status: string; cost_usd: number; error: string | null
  }>
  integrations: IntegrationRecord[]
}

const AGENT_ICONS: Record<string, string> = {
  sales: '💬', email: '✉️', pinterest: '📌', listing: '🏷️',
  video: '🎬', ads: '📢', seo: '📝', support: '🎧',
  bundles: '📦', trends: '🔍', analyst: '📊',
}

const STATUS_COLOUR: Record<string, string> = {
  completed: '#6E7E66',
  running:   '#C9A84C',
  failed:    '#C9847C',
  skipped:   'var(--text-muted)',
}

function StatusDot({ status }: { status: string | null }) {
  const colour = status ? STATUS_COLOUR[status] ?? 'var(--text-muted)' : 'var(--text-muted)'
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: colour }} />
}

function IntegrationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; colour: string }> = {
    connected:    { label: 'Connected',    colour: '#6E7E66' },
    disconnected: { label: 'Not connected',colour: 'var(--text-muted)' },
    error:        { label: 'Error',        colour: '#C9847C' },
    expired:      { label: 'Token expired',colour: '#C9A84C' },
  }
  const { label, colour } = map[status] ?? map.disconnected
  return <span className="text-xs" style={{ color: colour }}>{label}</span>
}

export default function CommandCentreClient({ globalConfig, agents, pendingApprovals, recentRuns, integrations }: Props) {
  const [paused, setPaused] = useState(globalConfig.all_agents_paused)
  const [pending, startTransition] = useTransition()

  const toggleGlobal = () => {
    startTransition(async () => {
      const res = await fetch('/api/admin/agents/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !paused }),
      })
      if (res.ok) {
        setPaused(p => !p)
        toast.success(paused ? 'All agents resumed' : 'All agents paused')
      } else {
        toast.error('Failed to update kill switch')
      }
    })
  }

  const enabledCount  = agents.filter(a => a.enabled).length
  const errorCount    = agents.filter(a => a.last_run_status === 'failed').length
  const connectedIntegrations = integrations.filter(i => i.status === 'connected').length

  const kpiCards = [
    {
      label: 'Agents Active',
      value: `${enabledCount} / ${agents.length}`,
      icon: Bot,
      colour: 'rgba(201,168,76,0.12)',
      accent: 'var(--gold)',
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals.toString(),
      icon: CheckSquare,
      colour: pendingApprovals > 0 ? 'rgba(201,132,124,0.12)' : 'rgba(205,199,190,0.12)',
      accent: pendingApprovals > 0 ? '#C9847C' : '#7B6FAE',
      href: '/admin/agents/approvals',
    },
    {
      label: 'Integrations Live',
      value: `${connectedIntegrations} / ${integrations.length}`,
      icon: Zap,
      colour: 'rgba(110,126,102,0.12)',
      accent: '#6E7E66',
      href: '/admin/agents/integrations',
    },
    {
      label: 'Agent Errors',
      value: errorCount.toString(),
      icon: AlertTriangle,
      colour: errorCount > 0 ? 'rgba(201,132,124,0.12)' : 'rgba(205,199,190,0.12)',
      accent: errorCount > 0 ? '#C9847C' : 'var(--text-muted)',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

      {/* Header + global kill switch */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
            Agent Command Centre
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            11 growth agents · Phase 1 (Sales, Email, Pinterest) builds first
          </p>
        </div>

        <button
          onClick={toggleGlobal}
          disabled={pending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border"
          style={{
            background:  paused ? 'rgba(201,132,124,0.15)' : 'rgba(110,126,102,0.12)',
            borderColor: paused ? '#C9847C' : '#6E7E66',
            color:       paused ? '#C9847C' : '#6E7E66',
            opacity:     pending ? 0.6 : 1,
          }}
        >
          {paused ? <><ZapOff size={15} /> All agents paused</> : <><Zap size={15} /> Agents running</>}
        </button>
      </div>

      {paused && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ background: 'rgba(201,132,124,0.08)', borderColor: '#C9847C' }}
        >
          <AlertTriangle size={16} style={{ color: '#C9847C', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            <strong>Global kill switch is on.</strong> All agents are paused. No outbound messages, emails or posts will be sent.
          </p>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            {card.href ? (
              <Link
                href={card.href}
                className="block p-5 rounded-2xl border hover:opacity-90 transition-opacity"
                style={{ background: card.colour, borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <card.icon size={18} style={{ color: card.accent }} />
                  <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
              </Link>
            ) : (
              <div
                className="p-5 rounded-2xl border"
                style={{ background: card.colour, borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <card.icon size={18} style={{ color: card.accent }} />
                </div>
                <p className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Agent roster */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Agents</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Click an agent to configure it</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentTile key={agent.key} agent={agent} />
          ))}
        </div>
      </div>

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Recent Runs</h2>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Agent', 'Trigger', 'Status', 'Started', 'Cost'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <span>{AGENT_ICONS[run.agent_key] ?? '🤖'} {run.agent_key}</span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{run.trigger}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <StatusDot status={run.status} />
                        <span className="text-xs capitalize">{run.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(run.started_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      ${run.cost_usd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentRuns.length === 0 && (
        <div
          className="p-8 rounded-2xl border text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <Bot size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>No runs yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Enable an agent and trigger a manual run to see activity here.
          </p>
        </div>
      )}
    </div>
  )
}

function AgentTile({ agent }: { agent: AgentRecord }) {
  const [enabled, setEnabled] = useState(agent.enabled)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/agents/${agent.key}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (res.ok) {
        setEnabled(e => !e)
        toast.success(enabled ? `${agent.name} disabled` : `${agent.name} enabled`)
      } else {
        toast.error('Failed to update agent')
      }
    })
  }

  const budgetPct = agent.monthly_budget_usd > 0
    ? Math.min(100, Math.round((agent.budget_used_usd / agent.monthly_budget_usd) * 100))
    : 0

  return (
    <div
      className="p-4 rounded-2xl border flex flex-col gap-3"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{AGENT_ICONS[agent.key] ?? '🤖'}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Phase {agent.phase}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusDot status={agent.last_run_status} />
          <button
            onClick={toggle}
            disabled={pending}
            className="relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0"
            style={{
              background: enabled ? 'var(--gold)' : 'var(--border)',
              opacity: pending ? 0.6 : 1,
            }}
            aria-label={enabled ? 'Disable agent' : 'Enable agent'}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5"
              style={{ transform: `translateX(${enabled ? '18px' : '2px'})` }}
            />
          </button>
        </div>
      </div>

      <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{agent.description}</p>

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>
          {agent.last_run_at
            ? `Last run ${new Date(agent.last_run_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
            : 'Never run'}
        </span>
        {agent.monthly_budget_usd > 0 && (
          <span>${agent.budget_used_usd.toFixed(2)} / ${agent.monthly_budget_usd.toFixed(2)}</span>
        )}
      </div>

      {agent.monthly_budget_usd > 0 && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${budgetPct}%`,
              background: budgetPct > 90 ? '#C9847C' : budgetPct > 70 ? '#C9A84C' : '#6E7E66',
            }}
          />
        </div>
      )}

      <Link
        href={`/admin/agents/${agent.key}`}
        className="text-xs font-medium hover:underline"
        style={{ color: 'var(--gold)' }}
      >
        Configure →
      </Link>
    </div>
  )
}
