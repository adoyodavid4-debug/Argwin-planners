'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Play, Zap, ZapOff, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import type { AgentRecord, ActionType, AutonomyLevel } from '@/lib/agents/types'

interface Run {
  id: number; trigger: string; started_at: string; finished_at: string | null
  status: string; summary: string | null; tokens_in: number; tokens_out: number
  cost_usd: number; error: string | null; prompt_version: number | null
}
interface Prompt { id: number; version: number; content: string; created_at: string }
interface ApprovalSummary {
  id: number; action_type: string; title: string; status: string
  created_at: string; decided_at: string | null
}
interface KpiRow { date: string; channel: string; metric: string; value: number }

interface Props {
  agent:     AgentRecord
  runs:      Run[]
  prompts:   Prompt[]
  approvals: ApprovalSummary[]
  kpis:      KpiRow[]
}

const ACTION_TYPES: ActionType[] = [
  'publish_pin','update_listing','send_campaign','publish_post',
  'create_ad','change_budget','publish_article','change_price',
  'create_bundle','send_email','publish_reel','send_message',
]

const AUTONOMY_LABELS: Record<AutonomyLevel, { label: string; desc: string }> = {
  draft:   { label: 'Draft only',  desc: 'Creates drafts; never acts' },
  approve: { label: 'Needs approval', desc: 'Goes to Approvals queue' },
  auto:    { label: 'Auto (except spending)', desc: 'Acts immediately if permitted' },
}

const STATUS_COLOUR: Record<string, string> = {
  completed: '#6E7E66', running: '#C9A84C', failed: '#C9847C', skipped: 'var(--text-muted)',
  pending: '#C9A84C', approved: '#6E7E66', rejected: '#C9847C',
}

export default function AgentDetailClient({ agent, runs, prompts, approvals, kpis }: Props) {
  const router = useRouter()
  const [enabled, setEnabled]           = useState(agent.enabled)
  const [autonomy, setAutonomy]         = useState(agent.autonomy)
  const [budget, setBudget]             = useState(agent.monthly_budget_usd.toString())
  const [model, setModel]               = useState(agent.model ?? '')
  const [promptExpanded, setPromptExp]  = useState(false)
  const [editingPrompt, setEditPrompt]  = useState(prompts[0]?.content ?? '')
  const [pending, startTransition]      = useTransition()

  const toggleAgent = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/agents/${agent.key}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (res.ok) { setEnabled(e => !e); toast.success(enabled ? 'Agent disabled' : 'Agent enabled') }
      else toast.error('Failed to update')
    })
  }

  const saveSettings = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/agents/${agent.key}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autonomy,
          monthly_budget_usd: parseFloat(budget) || 0,
          model: model || null,
        }),
      })
      if (res.ok) toast.success('Settings saved')
      else toast.error('Failed to save')
    })
  }

  const savePrompt = () => {
    startTransition(async () => {
      const nextVersion = (prompts[0]?.version ?? 0) + 1
      const res = await fetch(`/api/admin/agents/${agent.key}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editingPrompt, version: nextVersion }),
      })
      if (res.ok) toast.success(`Prompt saved as v${nextVersion}`)
      else toast.error('Failed to save prompt')
    })
  }

  const totalCost = runs.reduce((s, r) => s + (r.cost_usd ?? 0), 0)
  const budgetPct = agent.monthly_budget_usd > 0
    ? Math.min(100, Math.round((agent.budget_used_usd / agent.monthly_budget_usd) * 100))
    : 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 justify-between flex-wrap">
        <div>
          <Link
            href="/admin/agents"
            className="flex items-center gap-1 text-xs mb-3 hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={12} /> Command Centre
          </Link>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>{agent.name}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{agent.description}</p>
          <span
            className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Phase {agent.phase}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {agent.key !== 'sales' && (
            <button
              onClick={() => {
                startTransition(async () => {
                  const res = await fetch(`/api/admin/agents/${agent.key}/run`, { method: 'POST' })
                  const json = await res.json().catch(() => ({})) as { summary?: string; skipped?: string; error?: string }
                  if (res.ok && !json.skipped) toast.success('Run completed')
                  else if (json.skipped) toast(`Skipped: ${json.skipped}`)
                  else toast.error(json.error ?? 'Run failed')
                  router.refresh()
                })
              }}
              disabled={pending || !enabled}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all"
              style={{
                borderColor: 'var(--border-gold)',
                color: 'var(--gold)',
                opacity: (pending || !enabled) ? 0.5 : 1,
              }}
            >
              <Play size={14} /> Run now
            </button>
          )}
          <button
            onClick={toggleAgent}
            disabled={pending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border transition-all"
            style={{
              background:  enabled ? 'rgba(110,126,102,0.12)' : 'rgba(205,199,190,0.12)',
              borderColor: enabled ? '#6E7E66' : 'var(--border)',
              color:       enabled ? '#6E7E66' : 'var(--text-muted)',
              opacity:     pending ? 0.6 : 1,
            }}
          >
            {enabled ? <><Zap size={15} /> Enabled</> : <><ZapOff size={15} /> Disabled</>}
          </button>
        </div>
      </div>

      {/* Budget bar */}
      {agent.monthly_budget_usd > 0 && (
        <div
          className="p-5 rounded-2xl border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            <span>Monthly budget</span>
            <span>${agent.budget_used_usd.toFixed(2)} of ${agent.monthly_budget_usd.toFixed(2)} used ({budgetPct}%)</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${budgetPct}%`,
                background: budgetPct > 90 ? '#C9847C' : budgetPct > 70 ? '#C9A84C' : '#6E7E66',
              }}
            />
          </div>
          {budgetPct >= 100 && (
            <p className="text-xs mt-2" style={{ color: '#C9847C' }}>
              Budget reached — agent is paused. Reset at the start of each calendar month.
            </p>
          )}
        </div>
      )}

      {/* Settings */}
      <Section title="Settings">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Monthly budget (USD)" hint="Set to 0 for no cap">
              <input
                type="number"
                min="0"
                step="1"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="input-field w-full"
              />
            </Field>
            <Field label="Model override" hint="Leave blank to use the default for this agent">
              <input
                type="text"
                placeholder="e.g. claude-sonnet-4-6"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="input-field w-full"
              />
            </Field>
          </div>

          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              Autonomy per action type
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ACTION_TYPES.map(action => (
                <div
                  key={action}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                >
                  <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {action.replace(/_/g, ' ')}
                  </span>
                  <select
                    value={(autonomy as Record<string, string>)[action] ?? 'approve'}
                    onChange={e => setAutonomy(prev => ({ ...prev, [action]: e.target.value as AutonomyLevel }))}
                    className="text-xs rounded-lg px-2 py-1 border outline-none"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {(Object.entries(AUTONOMY_LABELS) as [AutonomyLevel, { label: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Spending actions (create_ad, change_budget, change_price) always require approval, regardless of this setting.
            </p>
          </div>

          <button
            onClick={saveSettings}
            disabled={pending}
            className="btn-primary"
          >
            Save settings
          </button>
        </div>
      </Section>

      {/* System prompt */}
      <Section title={`System prompt ${prompts[0] ? `(v${prompts[0].version})` : ''}`}>
        <div className="space-y-3">
          <textarea
            value={editingPrompt}
            onChange={e => setEditPrompt(e.target.value)}
            rows={8}
            className="w-full text-xs rounded-xl px-4 py-3 border outline-none focus:ring-1 font-mono resize-y"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center gap-3">
            <button onClick={savePrompt} disabled={pending} className="btn-primary text-xs">
              Save as new version
            </button>
            {prompts.length > 1 && (
              <button
                onClick={() => setPromptExp(e => !e)}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {promptExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {prompts.length - 1} older version{prompts.length > 2 ? 's' : ''}
              </button>
            )}
          </div>
          {promptExpanded && prompts.slice(1).map(p => (
            <div
              key={p.id}
              className="p-3 rounded-xl border text-xs"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>v{p.version}</span>
                <button
                  onClick={() => setEditPrompt(p.content)}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--gold)' }}
                >
                  Restore
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-mono" style={{ color: 'var(--text-muted)' }}>{p.content}</pre>
            </div>
          ))}
        </div>
      </Section>

      {/* Recent runs */}
      <Section title="Recent runs">
        {runs.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Status','Trigger','Started','Duration','Tokens','Cost','Error'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map(r => {
                  const dur = r.finished_at
                    ? `${Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)}s`
                    : '—'
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-3 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs capitalize"
                          style={{ background: `${STATUS_COLOUR[r.status]}20`, color: STATUS_COLOUR[r.status] }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize" style={{ color: 'var(--text-muted)' }}>{r.trigger}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                        {new Date(r.started_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{dur}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                        {r.tokens_in + r.tokens_out > 0 ? (r.tokens_in + r.tokens_out).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                        {r.cost_usd > 0 ? `$${r.cost_usd.toFixed(4)}` : '—'}
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate" style={{ color: '#C9847C' }}>
                        {r.error ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Total cost (last {runs.length} runs): ${totalCost.toFixed(4)}
            </p>
          </div>
        )}
      </Section>

      {/* Recent approvals for this agent */}
      {approvals.length > 0 && (
        <Section title="Recent approvals">
          <div className="space-y-2">
            {approvals.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-xs"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                  <p style={{ color: 'var(--text-muted)' }}>{a.action_type.replace(/_/g, ' ')}</p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                  style={{ background: `${STATUS_COLOUR[a.status] ?? '#888'}20`, color: STATUS_COLOUR[a.status] ?? 'var(--text-muted)' }}
                >
                  {a.status}
                </span>
              </div>
            ))}
            <Link
              href={`/admin/agents/approvals?status=all`}
              className="text-xs hover:underline"
              style={{ color: 'var(--gold)' }}
            >
              View all →
            </Link>
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="p-6 rounded-2xl border"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}
