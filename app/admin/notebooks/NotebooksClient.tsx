'use client'
import { useState } from 'react'
import { Plus, Edit2, Trash2, Users, X, Globe, Lock, Share2, NotebookPen, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

interface Owner {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

interface Collaborator {
  id: string
  user_id: string
  role: 'editor' | 'viewer'
  invited_at: string
  accepted_at: string | null
  profiles: { email: string; full_name: string | null } | null
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
  created_at: string
  updated_at: string
  owner: Owner | null
  collaborator_count: number
}

type FormState = {
  name: string
  type: 'general' | 'custom'
  description: string
  cover_color: string
  status: 'active' | 'draft'
  visibility: 'private' | 'shared' | 'public'
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'general',
  description: '',
  cover_color: '#C9A84C',
  status: 'active',
  visibility: 'private',
}

const COVER_COLORS = ['#C9A84C', '#7B6FAE', '#6E7E66', '#C9847C', '#4A7FA5', '#374151']

function statusBadge(status: string) {
  if (status === 'active') return { bg: 'rgba(134,239,172,0.18)', color: '#16a34a', label: 'Active' }
  return { bg: 'rgba(148,163,184,0.18)', color: '#64748b', label: 'Draft' }
}

function visibilityBadge(v: string) {
  if (v === 'public')  return { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C',  label: 'Public',  Icon: Globe }
  if (v === 'shared')  return { bg: 'rgba(96,165,250,0.15)', color: '#3b82f6',  label: 'Shared',  Icon: Share2 }
  return                      { bg: 'rgba(148,163,184,0.15)', color: '#64748b', label: 'Private', Icon: Lock }
}

function typeBadge(t: string) {
  if (t === 'custom') return { bg: 'rgba(201,168,76,0.12)', color: '#C9A84C', label: 'Custom' }
  return                    { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: 'General' }
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: color }}
    >
      {initials || '?'}
    </div>
  )
}

export default function NotebooksClient({ notebooks: initial }: { notebooks: Notebook[] }) {
  const [notebooks, setNotebooks] = useState(initial)
  const [modal, setModal]         = useState<'add' | 'edit' | 'collaborators' | null>(null)
  const [selected, setSelected]   = useState<Notebook | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [collabs, setCollabs]     = useState<Collaborator[]>([])
  const [saving, setSaving]       = useState(false)
  const [loadingCollabs, setLoadingCollabs] = useState(false)

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all')
  const [typeFilter,   setTypeFilter]   = useState<'all' | 'general' | 'custom'>('all')

  const filtered = notebooks.filter(n => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false
    if (typeFilter   !== 'all' && n.type   !== typeFilter)   return false
    return true
  })

  function openAdd() {
    setForm(EMPTY_FORM)
    setSelected(null)
    setModal('add')
  }

  function openEdit(nb: Notebook) {
    setSelected(nb)
    setForm({
      name:        nb.name,
      type:        nb.type,
      description: nb.description ?? '',
      cover_color: nb.cover_color,
      status:      nb.status,
      visibility:  nb.visibility,
    })
    setModal('edit')
  }

  async function openCollabs(nb: Notebook) {
    setSelected(nb)
    setModal('collaborators')
    setCollabs([])
    setLoadingCollabs(true)
    try {
      const res = await fetch(`/api/admin/notebooks/${nb.id}/collaborators`)
      if (res.ok) setCollabs(await res.json())
    } finally {
      setLoadingCollabs(false)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Notebook name is required'); return }
    setSaving(true)
    try {
      if (modal === 'add') {
        const res = await fetch('/api/admin/notebooks', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const nb = await res.json()
        setNotebooks(prev => [nb, ...prev])
        toast.success('Notebook created')
      } else {
        const res = await fetch(`/api/admin/notebooks/${selected!.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const nb = await res.json()
        setNotebooks(prev => prev.map(n => n.id === nb.id ? { ...n, ...nb } : n))
        toast.success('Notebook updated')
      }
      setModal(null)
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(nb: Notebook) {
    if (!confirm(`Delete "${nb.name}"? This action cannot be undone.`)) return
    const res = await fetch(`/api/admin/notebooks/${nb.id}`, { method: 'DELETE' })
    if (res.ok) {
      setNotebooks(prev => prev.filter(n => n.id !== nb.id))
      toast.success('Notebook deleted')
    } else {
      toast.error('Failed to delete notebook')
    }
  }

  async function revokeCollab(collabId: string) {
    if (!confirm('Revoke this collaborator\'s access?')) return
    const res = await fetch(`/api/admin/notebooks/${selected!.id}/collaborators`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ collaborator_id: collabId }),
    })
    if (res.ok) {
      setCollabs(prev => prev.filter(c => c.id !== collabId))
      setNotebooks(prev => prev.map(n =>
        n.id === selected!.id ? { ...n, collaborator_count: n.collaborator_count - 1 } : n
      ))
      toast.success('Access revoked')
    } else {
      toast.error('Failed to revoke access')
    }
  }

  const closeModal = () => { setModal(null); setSelected(null) }

  return (
    <>
      {/* Filters + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: statusFilter === f ? 'var(--gold)' : 'var(--bg-card)',
                color:      statusFilter === f ? '#fff' : 'var(--text-secondary)',
                border:     '1px solid var(--border)',
              }}
            >
              {f === 'all' ? 'All Status' : f}
            </button>
          ))}
          <span className="w-px h-5" style={{ background: 'var(--border)' }} />
          {(['all', 'general', 'custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: typeFilter === f ? 'var(--gold)' : 'var(--bg-card)',
                color:      typeFilter === f ? '#fff' : 'var(--text-secondary)',
                border:     '1px solid var(--border)',
              }}
            >
              {f === 'all' ? 'All Types' : f}
            </button>
          ))}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--gold)' }}
        >
          <Plus size={15} /> Add Notebook
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-muted)' }}>
              <tr>
                {['Notebook', 'Type', 'Owner', 'Collaborators', 'Created', 'Status', 'Visibility', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                    <NotebookPen size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No notebooks found</p>
                  </td>
                </tr>
              ) : filtered.map(nb => {
                const st = statusBadge(nb.status)
                const vi = visibilityBadge(nb.visibility)
                const ty = typeBadge(nb.type)
                return (
                  <tr key={nb.id} style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Notebook name + color swatch */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: nb.cover_color }} />
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{nb.name}</p>
                          {nb.description && (
                            <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{nb.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: ty.bg, color: ty.color }}>
                        {ty.label}
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3">
                      {nb.owner ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={nb.owner.full_name || nb.owner.email} color="#7B6FAE" />
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{nb.owner.full_name || '—'}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{nb.owner.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Collaborators count */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {nb.collaborator_count} {nb.collaborator_count === 1 ? 'person' : 'people'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(nb.created_at).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>

                    {/* Visibility */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: vi.color }}>
                        <vi.Icon size={11} />{vi.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(nb)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          title="Edit"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => openCollabs(nb)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          title="Collaborators"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Users size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(nb)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {modal === 'add' ? 'Add Notebook' : 'Edit Notebook'}
              </h2>
              <button onClick={closeModal} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Notebook Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. My Research, 2026 Goals"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
                  style={{
                    background:  'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color:       'var(--text-primary)',
                  }}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
                <div className="flex gap-2">
                  {(['general', 'custom'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition-all"
                      style={{
                        background:  form.type === t ? 'var(--gold)' : 'var(--bg-secondary)',
                        color:       form.type === t ? '#fff' : 'var(--text-secondary)',
                        borderColor: form.type === t ? 'var(--gold)' : 'var(--border)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Description <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief description of this notebook"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Cover color */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cover Color</label>
                <div className="flex gap-2">
                  {COVER_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, cover_color: c }))}
                      className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                      style={{
                        background:  c,
                        outline:     form.cover_color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Status + Visibility */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Status</label>
                  <div className="flex gap-2">
                    {(['active', 'draft'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all"
                        style={{
                          background:  form.status === s ? 'var(--gold)' : 'var(--bg-secondary)',
                          color:       form.status === s ? '#fff' : 'var(--text-secondary)',
                          borderColor: form.status === s ? 'var(--gold)' : 'var(--border)',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Visibility</label>
                  <select
                    value={form.visibility}
                    onChange={e => setForm(f => ({ ...f, visibility: e.target.value as any }))}
                    className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="private">Private</option>
                    <option value="shared">Shared</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--gold)' }}
              >
                {saving ? 'Saving…' : modal === 'add' ? 'Create Notebook' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaborators Panel */}
      {modal === 'collaborators' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Collaborators</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.name}</p>
              </div>
              <button onClick={closeModal} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {loadingCollabs ? (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
            ) : collabs.length === 0 ? (
              <div className="py-10 text-center">
                <Users size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No collaborators on this notebook</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collabs.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={c.profiles?.full_name || c.profiles?.email || '?'}
                        color={c.role === 'editor' ? '#7B6FAE' : '#6E7E66'}
                      />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {c.profiles?.full_name || c.profiles?.email || 'Unknown User'}
                        </p>
                        {c.profiles?.full_name && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.profiles.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                        style={{
                          background: c.role === 'editor' ? 'rgba(196,189,179,0.15)' : 'rgba(110,126,102,0.15)',
                          color:      c.role === 'editor' ? '#7B6FAE' : '#6E7E66',
                        }}
                      >
                        {c.role}
                      </span>
                      <button
                        onClick={() => revokeCollab(c.id)}
                        className="p-1 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        style={{ color: '#ef4444' }}
                        title="Revoke access"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
