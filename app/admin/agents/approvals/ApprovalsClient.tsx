'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Approval {
  id: number
  agent_key: string
  action_type: string
  title: string
  preview: Record<string, unknown>
  status: string
  decided_at: string | null
  feedback: string | null
  expires_at: string
  created_at: string
  ag_agents: { name: string } | null
}

interface Props {
  approvals:    Approval[]
  pendingCount: number
  activeStatus: string
}

const TABS = [
  { key: 'pending',  label: 'Pending',  icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'all',      label: 'All',      icon: AlertCircle },
]

const ACTION_LABELS: Record<string, string> = {
  publish_pin:     'Publish Pin',
  update_listing:  'Update Listing',
  send_campaign:   'Send Campaign',
  publish_post:    'Publish Post',
  create_ad:       'Create Ad',
  change_budget:   'Change Budget',
  publish_article: 'Publish Article',
  change_price:    'Change Price',
  create_bundle:   'Create Bundle',
  send_email:      'Send Email',
  publish_reel:    'Publish Reel',
  send_message:    'Send Message',
}

export default function ApprovalsClient({ approvals, pendingCount, activeStatus }: Props) {
  const router       = useRouter()
  const [items, setItems] = useState(approvals)
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({})

  const decide = async (id: number, decision: 'approved' | 'rejected') => {
    const feedback = feedbacks[id] ?? ''
    const res = await fetch(`/api/admin/agents/approvals/${id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, feedback }),
    })
    if (res.ok) {
      toast.success(decision === 'approved' ? 'Approved' : 'Rejected')
      setItems(prev => prev.map(a =>
        a.id === id ? { ...a, status: decision, decided_at: new Date().toISOString() } : a
      ))
      router.refresh()
    } else {
      toast.error('Failed to update approval')
    }
  }

  const daysUntilExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86_400_000))
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Approvals</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {pendingCount > 0
              ? `${pendingCount} item${pendingCount !== 1 ? 's' : ''} waiting for your decision`
              : 'All caught up — nothing pending'}
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => router.push(`/admin/agents/approvals?status=${tab.key}`)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px"
            style={{
              color:       activeStatus === tab.key ? 'var(--gold)' : 'var(--text-secondary)',
              borderColor: activeStatus === tab.key ? 'var(--gold)' : 'transparent',
            }}
          >
            <tab.icon size={13} />
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: '#C9847C', color: 'white' }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Approvals list */}
      {items.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <CheckCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Nothing here</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            When agents draft content for your review it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              feedback={feedbacks[approval.id] ?? ''}
              onFeedbackChange={v => setFeedbacks(prev => ({ ...prev, [approval.id]: v }))}
              onDecide={decide}
              daysLeft={daysUntilExpiry(approval.expires_at)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ApprovalCard({
  approval, feedback, onFeedbackChange, onDecide, daysLeft,
}: {
  approval: Approval
  feedback: string
  onFeedbackChange: (v: string) => void
  onDecide: (id: number, decision: 'approved' | 'rejected') => Promise<void>
  daysLeft: number
}) {
  const [pending, startTransition] = useTransition()
  const isPending = approval.status === 'pending'

  const statusStyle: Record<string, { label: string; colour: string }> = {
    pending:  { label: 'Pending',  colour: '#C9A84C' },
    approved: { label: 'Approved', colour: '#6E7E66' },
    rejected: { label: 'Rejected', colour: '#C9847C' },
    edited:   { label: 'Edited',   colour: '#7B6FAE' },
    expired:  { label: 'Expired',  colour: 'var(--text-muted)' },
  }
  const style = statusStyle[approval.status] ?? statusStyle.pending

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: `${style.colour}20`, color: style.colour }}
            >
              {style.label}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {ACTION_LABELS[approval.action_type] ?? approval.action_type}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {approval.ag_agents?.name ?? approval.agent_key}
            </span>
          </div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{approval.title}</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Created {new Date(approval.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
            {isPending && daysLeft <= 3 && (
              <span style={{ color: '#C9847C' }}> · Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </div>

      {/* Preview */}
      {Object.keys(approval.preview).length > 0 && (
        <div className="mx-6 mb-4 p-4 rounded-xl text-xs font-mono overflow-x-auto"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', maxHeight: 200 }}>
          <PreviewRenderer preview={approval.preview} actionType={approval.action_type} />
        </div>
      )}

      {/* Previous feedback */}
      {approval.feedback && (
        <div
          className="mx-6 mb-4 p-3 rounded-xl text-xs flex gap-2"
          style={{ background: 'rgba(201,132,124,0.08)', color: 'var(--text-secondary)' }}
        >
          <MessageSquare size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#C9847C' }} />
          <span><strong>Feedback:</strong> {approval.feedback}</span>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="px-6 pb-5 space-y-3">
          <textarea
            value={feedback}
            onChange={e => onFeedbackChange(e.target.value)}
            placeholder="Optional feedback for the agent (shown on rejection so it can improve its next draft)…"
            rows={2}
            className="w-full text-xs rounded-xl px-3 py-2 border resize-none outline-none focus:ring-1"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => startTransition(() => onDecide(approval.id, 'approved'))}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(110,126,102,0.15)',
                color: '#6E7E66',
                opacity: pending ? 0.6 : 1,
              }}
            >
              <Check size={14} /> Approve
            </button>
            <button
              onClick={() => startTransition(() => onDecide(approval.id, 'rejected'))}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(201,132,124,0.15)',
                color: '#C9847C',
                opacity: pending ? 0.6 : 1,
              }}
            >
              <X size={14} /> Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewRenderer({ preview, actionType }: { preview: Record<string, unknown>; actionType: string }) {
  if (actionType === 'publish_pin' && preview.copy) {
    return (
      <div className="space-y-1 not-mono" style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
        {preview.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.image_url as string} alt="" className="w-32 rounded-lg mb-2" />
        )}
        <p><strong>Title:</strong> {preview.title as string}</p>
        <p><strong>Copy:</strong> {preview.copy as string}</p>
        {preview.board && <p><strong>Board:</strong> {preview.board as string}</p>}
        {preview.link && <p><strong>Link:</strong> {preview.link as string}</p>}
      </div>
    )
  }

  if (actionType === 'send_email' && preview.subject) {
    return (
      <div className="space-y-1">
        <p><strong>Subject:</strong> {preview.subject as string}</p>
        <p><strong>Segment:</strong> {preview.segment as string}</p>
        <p><strong>Recipients:</strong> {preview.recipient_count as number}</p>
        {preview.preview_text && <p><strong>Preview text:</strong> {preview.preview_text as string}</p>}
      </div>
    )
  }

  if (actionType === 'update_listing' && preview.diff) {
    const diff = preview.diff as Record<string, { old: string; new: string }>
    return (
      <div className="space-y-2">
        {Object.entries(diff).map(([field, { old: oldVal, new: newVal }]) => (
          <div key={field}>
            <p className="font-semibold capitalize">{field}</p>
            <p style={{ color: '#C9847C' }}>− {oldVal}</p>
            <p style={{ color: '#6E7E66' }}>+ {newVal}</p>
          </div>
        ))}
      </div>
    )
  }

  return <pre className="whitespace-pre-wrap">{JSON.stringify(preview, null, 2)}</pre>
}
