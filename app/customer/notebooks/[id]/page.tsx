'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Lock, Share2, Edit2, Check, X, Users, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Collab {
  id: string
  user_id: string
  role: 'editor' | 'viewer'
  profiles: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null
}

interface Notebook {
  id: string
  name: string
  type: 'general' | 'custom'
  description: string | null
  cover_color: string
  status: 'active' | 'draft'
  visibility: 'private' | 'shared' | 'public'
  owner_id: string
  last_edited_by: string | null
  created_at: string
  updated_at: string
  profiles?: { id: string; email: string; full_name: string | null } | null
  notebook_collaborators?: Collab[]
  notebook_activity_log?: { id: string; user_id: string | null; action: string; metadata: any; created_at: string }[]
  _effective_role?: string
}

function timeAgo(date: string) {
  const diff  = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return new Date(date).toLocaleDateString()
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function visibilityIcon(v: string) {
  if (v === 'public')  return <Globe  size={14} />
  if (v === 'shared')  return <Share2 size={14} />
  return                      <Lock   size={14} />
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    created:              'Created this notebook',
    edited:               'Edited this notebook',
    collaborator_invited: 'Invited a collaborator',
    collaborator_removed: 'Removed a collaborator',
  }
  return map[action] ?? action
}

export default function NotebookDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [nb,     setNb]      = useState<Notebook | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetch(`/api/notebooks/${id}`)
      .then(r => {
        if (r.status === 404 || r.status === 403) { router.replace('/customer/notebooks'); return null }
        return r.json()
      })
      .then(data => { if (data) setNb(data) })
      .finally(() => setLoading(false))
  }, [id, router])

  async function saveName() {
    if (!nb || !editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/notebooks/${nb.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: editName.trim(), description: editDesc }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await res.json()
      setNb(prev => prev ? { ...prev, ...updated } : prev)
      setEditing(false)
      toast.success('Notebook updated')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const canEdit = nb?._effective_role === 'owner' || nb?._effective_role === 'admin' || nb?._effective_role === 'editor'
  const isOwner = nb?._effective_role === 'owner' || nb?._effective_role === 'admin'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--gold)' }} />
      </div>
    )
  }

  if (!nb) return null

  const collabs = nb.notebook_collaborators ?? []
  const log     = nb.notebook_activity_log ?? []

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header bar */}
      <div
        className="sticky top-0 z-30 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/customer/notebooks" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={15} /> Notebooks
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>

          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
                className="px-2 py-1 rounded-lg border text-sm font-semibold outline-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <button onClick={saveName} disabled={saving} style={{ color: '#16a34a' }}>
                <Check size={16} />
              </button>
              <button onClick={() => setEditing(false)} style={{ color: '#ef4444' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{nb.name}</span>
              {canEdit && (
                <button
                  onClick={() => { setEditName(nb.name); setEditDesc(nb.description ?? ''); setEditing(true) }}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Edit2 size={13} />
                </button>
              )}
            </div>
          )}

          {/* Role badge */}
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
            style={{
              background: nb._effective_role === 'owner' || nb._effective_role === 'admin'
                ? 'rgba(201,168,76,0.15)' : 'rgba(148,163,184,0.12)',
              color: nb._effective_role === 'owner' || nb._effective_role === 'admin'
                ? 'var(--gold)' : '#64748b',
            }}
          >
            {nb._effective_role}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main workspace */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cover */}
          <div
            className="rounded-2xl h-36 flex items-end p-5"
            style={{ background: nb.cover_color }}
          >
            <div>
              <span className="text-white/70 text-xs font-medium uppercase tracking-wider block mb-1">
                {nb.type} notebook
              </span>
              <h1 className="text-white text-2xl font-bold leading-tight">{nb.name}</h1>
            </div>
          </div>

          {/* Description */}
          {nb.description && (
            <div
              className="rounded-2xl border p-5"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{nb.description}</p>
            </div>
          )}

          {/* Content area placeholder */}
          <div
            className="rounded-2xl border p-8 min-h-64 flex flex-col items-center justify-center text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderStyle: 'dashed' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(201,168,76,0.12)' }}
            >
              <Edit2 size={18} style={{ color: 'var(--gold)' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {canEdit ? 'Notebook workspace' : 'Read-only notebook'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {canEdit
                ? 'A rich text editor can be connected here to store notebook content'
                : 'You have view-only access to this notebook'}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Details</h3>

            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {visibilityIcon(nb.visibility)}
              <span className="capitalize">{nb.visibility}</span>
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={14} />
              <span>Updated {timeAgo(nb.updated_at)}</span>
            </div>

            {nb.profiles && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#7B6FAE' }}
                >
                  {initials(nb.profiles.full_name || nb.profiles.email)}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {nb.profiles.full_name || nb.profiles.email}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Owner</p>
                </div>
              </div>
            )}
          </div>

          {/* Collaborators */}
          {collabs.length > 0 && (
            <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Collaborators
              </h3>
              <div className="space-y-2">
                {collabs.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: c.role === 'editor' ? '#7B6FAE' : '#6E7E66' }}
                    >
                      {initials(c.profiles?.full_name || c.profiles?.email || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {c.profiles?.full_name || c.profiles?.email || 'Unknown'}
                      </p>
                    </div>
                    <span
                      className="text-xs rounded-full px-1.5 py-0.5 font-medium capitalize"
                      style={{
                        background: c.role === 'editor' ? 'rgba(196,189,179,0.12)' : 'rgba(110,126,102,0.12)',
                        color:      c.role === 'editor' ? '#7B6FAE' : '#6E7E66',
                      }}
                    >
                      {c.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity log */}
          {log.length > 0 && (
            <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Activity
              </h3>
              <div className="space-y-2.5">
                {log.slice(0, 8).map(entry => (
                  <div key={entry.id} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <p>{actionLabel(entry.action)}</p>
                    <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{timeAgo(entry.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <Link
              href="/customer/notebooks"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-sm font-medium transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <Users size={14} /> Manage in Notebooks
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
