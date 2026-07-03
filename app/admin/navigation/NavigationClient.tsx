'use client'

import { useState } from 'react'
import { Plus, X, Loader2, ArrowUp, ArrowDown, CornerDownRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { NavLink, NavLocation } from '@/types/database'

const LOCATIONS: { value: NavLocation; label: string; hint: string }[] = [
  { value: 'header',         label: 'Header',           hint: 'Main navigation bar. Items with children become dropdowns.' },
  { value: 'footer_shop',    label: 'Footer — Shop',    hint: 'Links in the footer "Shop" column.' },
  { value: 'footer_company', label: 'Footer — Company', hint: 'Links in the footer "Company" column.' },
  { value: 'footer_support', label: 'Footer — Support', hint: 'Links in the footer "Support" column.' },
]

interface FormState {
  id?: string
  label: string
  href: string
  location: NavLocation
  parent_id: string | null
  sort_order: number
  is_active: boolean
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-300"
      style={{ background: value ? 'var(--gold)' : 'var(--border)' }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: value ? '22px' : '2px' }} />
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase mb-1.5"
      style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}>
      {children}
    </p>
  )
}

export default function NavigationClient({ initialLinks }: { initialLinks: NavLink[] }) {
  const [links,      setLinks]      = useState(initialLinks)
  const [form,       setForm]       = useState<FormState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busy,       setBusy]       = useState<string | null>(null)

  const topLevel = (location: NavLocation) =>
    links
      .filter((l) => l.location === location && !l.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order)

  const childrenOf = (parentId: string) =>
    links
      .filter((l) => l.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)

  const headerParents = topLevel('header')

  const openNew = (location: NavLocation, parentId: string | null = null) => {
    const siblings = parentId ? childrenOf(parentId) : topLevel(location)
    setForm({
      label: '', href: '', location, parent_id: parentId,
      sort_order: (siblings[siblings.length - 1]?.sort_order ?? 0) + 1,
      is_active: true,
    })
  }

  const openEdit = (l: NavLink) => setForm({
    id: l.id, label: l.label, href: l.href, location: l.location,
    parent_id: l.parent_id, sort_order: l.sort_order, is_active: l.is_active,
  })

  const save = async () => {
    if (!form) return
    if (!form.label.trim()) { toast.error('Label is required'); return }
    if (!form.href.trim())  { toast.error('Link URL is required'); return }

    setSubmitting(true)
    const payload = {
      label:      form.label.trim(),
      href:       form.href.trim(),
      location:   form.location,
      parent_id:  form.parent_id,
      sort_order: form.sort_order,
      is_active:  form.is_active,
    }
    try {
      const res = await fetch(
        form.id ? `/api/admin/navigation/${form.id}` : '/api/admin/navigation',
        {
          method:  form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save')
      setLinks((p) => form.id ? p.map((l) => (l.id === form.id ? data : l)) : [...p, data])
      toast.success(form.id ? 'Link updated' : 'Link added')
      setForm(null)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const patchLink = async (id: string, patch: Partial<NavLink>) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/navigation/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to update')
      setLinks((p) => p.map((l) => (l.id === id ? data : l)))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (l: NavLink) => {
    const kids = childrenOf(l.id).length
    const msg = kids > 0
      ? `Delete "${l.label}" and its ${kids} dropdown item(s)?`
      : `Delete "${l.label}"?`
    if (!confirm(msg)) return
    setBusy(l.id)
    try {
      const res = await fetch(`/api/admin/navigation/${l.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      setLinks((p) => p.filter((x) => x.id !== l.id && x.parent_id !== l.id))
      toast.success('Link deleted')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const move = async (list: NavLink[], index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const a = list[index]
    const b = list[target]
    setLinks((p) => p.map((l) => {
      if (l.id === a.id) return { ...l, sort_order: b.sort_order }
      if (l.id === b.id) return { ...l, sort_order: a.sort_order }
      return l
    }))
    await Promise.all([
      fetch(`/api/admin/navigation/${a.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/navigation/${b.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ])
  }

  const LinkRow = ({ link, list, index, indent }: { link: NavLink; list: NavLink[]; index: number; indent?: boolean }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)', opacity: link.is_active ? 1 : 0.5, paddingLeft: indent ? '2.5rem' : undefined }}>
      {indent && <CornerDownRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{link.label}</p>
        <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{link.href}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => move(list, index, -1)} disabled={index === 0 || busy === link.id}
          className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move up">
          <ArrowUp size={13} />
        </button>
        <button onClick={() => move(list, index, 1)} disabled={index === list.length - 1 || busy === link.id}
          className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move down">
          <ArrowDown size={13} />
        </button>
      </div>
      <Toggle value={link.is_active} onChange={(v) => patchLink(link.id, { is_active: v })} />
      <div className="flex items-center gap-3 text-xs flex-shrink-0">
        <button onClick={() => openEdit(link)} className="hover:underline" style={{ color: 'var(--gold)' }}>Edit</button>
        <button onClick={() => remove(link)} disabled={busy === link.id}
          className="hover:underline disabled:opacity-50" style={{ color: '#C9847C' }}>Delete</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {LOCATIONS.map(({ value, label, hint }) => {
        const items = topLevel(value)
        return (
          <div key={value}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>
              </div>
              <button onClick={() => openNew(value)} className="btn-outline text-xs"
                style={{ padding: '0.45rem 0.9rem' }}>
                <Plus size={13} /> Add Link
              </button>
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              {items.length === 0 && (
                <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  No links yet.
                </p>
              )}
              {items.map((link, i) => {
                const kids = childrenOf(link.id)
                return (
                  <div key={link.id}>
                    <LinkRow link={link} list={items} index={i} />
                    {value === 'header' && kids.map((child, j) => (
                      <LinkRow key={child.id} link={child} list={kids} index={j} indent />
                    ))}
                    {value === 'header' && (
                      <div className="px-4 py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)', paddingLeft: '2.5rem' }}>
                        <button onClick={() => openNew('header', link.id)}
                          className="text-xs inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--text-muted)' }}>
                          <Plus size={11} /> Add dropdown item
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Modal form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => !submitting && setForm(null)}>
          <div className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                {form.id ? 'Edit Link' : form.parent_id ? 'New Dropdown Item' : 'New Link'}
              </h2>
              <button onClick={() => setForm(null)} className="btn-ghost" style={{ padding: '0.375rem' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Label *</FieldLabel>
                <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Shop" className="input-field" />
              </div>
              <div>
                <FieldLabel>URL *</FieldLabel>
                <input type="text" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })}
                  placeholder="/shop" className="input-field" />
              </div>
              {!form.parent_id && (
                <div>
                  <FieldLabel>Location</FieldLabel>
                  <select value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value as NavLocation })}
                    className="input-field">
                    {LOCATIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.location === 'header' && !form.id && form.parent_id && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  This item will appear in the dropdown under{' '}
                  <b style={{ color: 'var(--text-primary)' }}>
                    {headerParents.find((p) => p.id === form.parent_id)?.label ?? 'its parent'}
                  </b>.
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</span>
                  <Toggle value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort</span>
                  <input type="number" value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="input-field w-20" style={{ padding: '0.4rem 0.6rem' }} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => setForm(null)} disabled={submitting}
                  className="btn-outline" style={{ padding: '0.55rem 1.2rem', fontSize: '0.8rem' }}>
                  Cancel
                </button>
                <button onClick={save} disabled={submitting}
                  className="btn-primary" style={{ padding: '0.55rem 1.5rem', fontSize: '0.8rem' }}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : form.id ? 'Save Changes' : 'Add Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
