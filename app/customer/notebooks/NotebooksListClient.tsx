'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Globe, Lock, Share2, Edit2, Trash2, Users, X, BookOpen, NotebookPen } from 'lucide-react'
import toast from 'react-hot-toast'

interface CollabProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

interface CollabEntry {
  id: string
  user_id: string
  profiles: CollabProfile | null
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
  notebook_collaborators?: CollabEntry[]
  profiles?: CollabProfile | null
  _shared_as?: 'editor' | 'viewer'
}

const COVER_COLORS = ['#A0830E', '#7B6FAE', '#6E7E66', '#C9847C', '#4A7FA5', '#374151']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function visibilityIcon(v: string) {
  if (v === 'public')  return <Globe  size={12} />
  if (v === 'shared')  return <Share2 size={12} />
  return                      <Lock   size={12} />
}

function visibilityColor(v: string) {
  if (v === 'public')  return '#A0830E'
  if (v === 'shared')  return '#3b82f6'
  return                      '#94a3b8'
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)   return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

type CreateModal = { type: 'general' | 'custom' | null }
type ShareModal  = { notebook: Notebook; collabs: any[] } | null

export default function NotebooksListClient({
  owned, shared, userId,
}: {
  owned:  Notebook[]
  shared: Notebook[]
  userId: string
}) {
  const [ownedList, setOwnedList] = useState(owned)
  const [sharedList]              = useState(shared)
  const [createModal, setCreateModal] = useState<CreateModal>({ type: null })
  const [shareModal,  setShareModal]  = useState<ShareModal>(null)
  const [customName,  setCustomName]  = useState('')
  const [customColor, setCustomColor] = useState('#A0830E')
  const [customDesc,  setCustomDesc]  = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<'editor' | 'viewer'>('viewer')
  const [creating,    setCreating]    = useState(false)
  const [inviting,    setInviting]    = useState(false)
  const [shareCollabs, setShareCollabs] = useState<any[]>([])
  const [loadingShare, setLoadingShare] = useState(false)

  async function createGeneral() {
    setCreating(true)
    try {
      const res = await fetch('/api/notebooks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'general' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const nb = await res.json()
      setOwnedList(prev => [nb, ...prev])
      toast.success(`Created "${nb.name}"`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function createCustom() {
    if (!customName.trim()) { toast.error('Please enter a notebook name'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/notebooks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:        'custom',
          name:        customName.trim(),
          description: customDesc.trim() || undefined,
          cover_color: customColor,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const nb = await res.json()
      setOwnedList(prev => [nb, ...prev])
      toast.success(`Created "${nb.name}"`)
      setCreateModal({ type: null })
      setCustomName(''); setCustomDesc(''); setCustomColor('#A0830E')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function deleteNotebook(nb: Notebook) {
    if (!confirm(`Delete "${nb.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/notebooks/${nb.id}`, { method: 'DELETE' })
    if (res.ok) {
      setOwnedList(prev => prev.filter(n => n.id !== nb.id))
      toast.success('Notebook deleted')
    } else {
      toast.error('Failed to delete')
    }
  }

  async function openShare(nb: Notebook) {
    setShareModal({ notebook: nb, collabs: [] })
    setShareCollabs([])
    setLoadingShare(true)
    try {
      const res = await fetch(`/api/notebooks/${nb.id}/collaborators`)
      if (res.ok) setShareCollabs(await res.json())
    } finally {
      setLoadingShare(false)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !shareModal) return
    setInviting(true)
    try {
      const res = await fetch(`/api/notebooks/${shareModal.notebook.id}/collaborators`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const collab = await res.json()
      setShareCollabs(prev => [collab, ...prev])
      setInviteEmail('')
      toast.success('Collaborator invited')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setInviting(false)
    }
  }

  async function revokeCollab(collabId: string) {
    if (!shareModal) return
    const res = await fetch(`/api/notebooks/${shareModal.notebook.id}/collaborators`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ collaborator_id: collabId }),
    })
    if (res.ok) {
      setShareCollabs(prev => prev.filter((c: any) => c.id !== collabId))
      toast.success('Access revoked')
    } else {
      toast.error('Failed to revoke')
    }
  }

  function NotebookCard({ nb, isOwner }: { nb: Notebook; isOwner: boolean }) {
    const collabs = nb.notebook_collaborators ?? []
    const vc      = visibilityColor(nb.visibility)
    const isCustom = nb.type === 'custom'

    return (
      <div
        className="rounded-2xl border overflow-hidden flex flex-col transition-shadow hover:shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        {/* Cover */}
        <div
          className="h-24 flex items-center justify-center relative"
          style={{ background: nb.cover_color }}
        >
          <NotebookPen size={32} color="rgba(255,255,255,0.7)" />
          {/* Type badge */}
          <span
            className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              background: isCustom ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.25)',
              color: '#fff',
            }}
          >
            {isCustom ? 'Custom' : 'General'}
          </span>
          {/* Shared badge */}
          {!isOwner && (
            <span
              className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: 'rgba(0,0,0,0.35)', color: '#fff' }}
            >
              Shared with me
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">
          <Link
            href={`/customer/notebooks/${nb.id}`}
            className="font-bold text-sm mb-1 hover:underline line-clamp-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {nb.name}
          </Link>

          {nb.description && (
            <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {nb.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-auto pt-2">
            {/* Visibility */}
            <span className="flex items-center gap-1 text-xs" style={{ color: vc }}>
              {visibilityIcon(nb.visibility)}
              <span className="capitalize">{nb.visibility}</span>
            </span>

            {/* Last edited */}
            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(nb.updated_at)}
            </span>
          </div>

          {/* Collaborator avatars */}
          {collabs.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {collabs.slice(0, 4).map((c: CollabEntry) => (
                <div
                  key={c.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border-2"
                  style={{ background: '#7B6FAE', borderColor: 'var(--bg-card)' }}
                  title={c.profiles?.full_name || c.profiles?.email || ''}
                >
                  {initials(c.profiles?.full_name || c.profiles?.email || '?')}
                </div>
              ))}
              {collabs.length > 4 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{collabs.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions (owner only) */}
        {isOwner && (
          <div className="flex items-center border-t px-4 py-2 gap-2" style={{ borderColor: 'var(--border)' }}>
            <Link
              href={`/customer/notebooks/${nb.id}`}
              className="flex items-center gap-1 text-xs font-medium flex-1 hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              <BookOpen size={12} /> Open
            </Link>
            <button
              onClick={() => openShare(nb)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              title="Share"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Users size={13} />
            </button>
            <button
              onClick={() => deleteNotebook(nb)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
              title="Delete"
              style={{ color: '#ef4444' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            My Notebooks
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Capture ideas, plans, and everything in between
          </p>

          {/* Create buttons */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={createGeneral}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ background: 'var(--gold)' }}
            >
              <Plus size={15} /> Quick Notebook
            </button>
            <button
              onClick={() => setCreateModal({ type: 'custom' })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <NotebookPen size={15} /> Custom Notebook
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Owned notebooks */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              My Notebooks
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(160,131,14,0.12)', color: 'var(--gold)' }}
            >
              {ownedList.length}
            </span>
          </div>

          {ownedList.length === 0 ? (
            <div
              className="rounded-2xl border p-12 text-center"
              style={{ borderColor: 'var(--border)', borderStyle: 'dashed' }}
            >
              <NotebookPen size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No notebooks yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Click "Quick Notebook" to create your first one
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {ownedList.map(nb => <NotebookCard key={nb.id} nb={nb} isOwner />)}
            </div>
          )}
        </section>

        {/* Shared with me */}
        {sharedList.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Shared with Me
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(96,165,250,0.12)', color: '#3b82f6' }}
              >
                {sharedList.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sharedList.map(nb => (
                <NotebookCard
                  key={nb.id}
                  nb={nb}
                  isOwner={false}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Custom notebook creation modal */}
      {createModal.type === 'custom' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>New Custom Notebook</h2>
              <button onClick={() => setCreateModal({ type: null })} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Notebook Name *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. 2026 Goals, Client Notes"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Description <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <textarea
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                  rows={2}
                  placeholder="What's this notebook for?"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cover Color</label>
                <div className="flex gap-2">
                  {COVER_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setCustomColor(c)}
                      className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                      style={{
                        background:    c,
                        outline:       customColor === c ? `3px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setCreateModal({ type: null })}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={createCustom}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--gold)' }}
              >
                {creating ? 'Creating…' : 'Create Notebook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share / Collaborators modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Share Notebook</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{shareModal.notebook.name}</p>
              </div>
              <button onClick={() => { setShareModal(null); setInviteEmail('') }} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Invite form */}
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
                placeholder="Email address"
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="px-2 py-2 rounded-lg border text-xs outline-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--gold)' }}
              >
                {inviting ? '…' : 'Invite'}
              </button>
            </div>

            {/* Collaborator list */}
            {loadingShare ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Loading…</p>
            ) : shareCollabs.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No collaborators yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shareCollabs.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {c.profiles?.full_name || c.profiles?.email || 'Unknown'}
                      </p>
                      {c.profiles?.full_name && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.profiles.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                        style={{
                          background: c.role === 'editor' ? 'rgba(196,189,179,0.15)' : 'rgba(148,163,184,0.12)',
                          color:      c.role === 'editor' ? '#7B6FAE' : '#64748b',
                        }}
                      >
                        {c.role}
                      </span>
                      <button
                        onClick={() => revokeCollab(c.id)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950"
                        style={{ color: '#ef4444' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Copy link (public notebooks) */}
            {shareModal.notebook.visibility === 'public' && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/customer/notebooks/${shareModal.notebook.id}`}
                  className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/customer/notebooks/${shareModal.notebook.id}`)
                    toast.success('Link copied')
                  }}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Copy
                </button>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setShareModal(null); setInviteEmail('') }}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
