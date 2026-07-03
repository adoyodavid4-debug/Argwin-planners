'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Plus, X, Loader2, ImageIcon, Folder } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Category } from '@/types/database'

interface FormState {
  id?: string
  name: string
  slug: string
  icon: string
  sort_order: number
  is_featured: boolean
  image_url: string | null
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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

export default function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [items,      setItems]      = useState(initialCategories)
  const [form,       setForm]       = useState<FormState | null>(null)
  const [slugEdited, setSlugEdited] = useState(false)
  const [imageFile,  setImageFile]  = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busy,       setBusy]       = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const resetImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }

  const openNew = () => {
    resetImage()
    setSlugEdited(false)
    setForm({ name: '', slug: '', icon: '', sort_order: items.length + 1, is_featured: false, image_url: null })
  }

  const openEdit = (c: Category) => {
    resetImage()
    setSlugEdited(true)
    setForm({
      id: c.id, name: c.name, slug: c.slug, icon: c.icon ?? '',
      sort_order: c.sort_order, is_featured: c.is_featured, image_url: c.image_url,
    })
  }

  const save = async () => {
    if (!form) return
    if (!form.name.trim()) { toast.error('Name is required'); return }

    setSubmitting(true)
    const fd = new FormData()
    fd.append('name',        form.name.trim())
    fd.append('slug',        form.slug.trim() || slugify(form.name))
    fd.append('icon',        form.icon.trim())
    fd.append('sort_order',  String(form.sort_order))
    fd.append('is_featured', String(form.is_featured))
    if (imageFile) fd.append('image', imageFile)
    if (form.id && !form.image_url && !imageFile) fd.append('remove_image', 'true')

    try {
      const res = await fetch(
        form.id ? `/api/admin/categories/${form.id}` : '/api/admin/categories',
        { method: form.id ? 'PATCH' : 'POST', body: fd }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save')
      setItems((p) => {
        const next = form.id ? p.map((c) => (c.id === form.id ? data : c)) : [...p, data]
        return [...next].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      })
      toast.success(form.id ? 'Category updated' : 'Category created')
      setForm(null)
      resetImage()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const patchItem = async (id: string, patch: Record<string, unknown>) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to update')
      setItems((p) => p.map((c) => (c.id === id ? data : c)))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return
    setBusy(c.id)
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      setItems((p) => p.filter((x) => x.id !== c.id))
      toast.success('Category deleted')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const displayImage = imagePreview ?? form?.image_url ?? null

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={openNew} className="btn-primary text-sm">
          <Plus size={15} /> Add Category
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--bg-subtle)' }}>
            <tr className="text-left">
              <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Category</th>
              <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Icon</th>
              <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Sort</th>
              <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Featured</th>
              <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No categories yet.
                </td>
              </tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {c.image_url ? (
                      <span className="relative w-9 h-9 rounded-lg overflow-hidden border flex-shrink-0"
                        style={{ borderColor: 'var(--border)' }}>
                        <Image src={c.image_url} alt="" fill className="object-cover" unoptimized />
                      </span>
                    ) : (
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(201,168,76,0.12)' }}>
                        <Folder size={15} style={{ color: 'var(--gold)' }} />
                      </span>
                    )}
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{c.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {c.icon || '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{c.sort_order}</td>
                <td className="px-4 py-3">
                  <Toggle value={c.is_featured} onChange={(v) => patchItem(c.id, { is_featured: v })} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-xs">
                    <button onClick={() => openEdit(c)} className="hover:underline" style={{ color: 'var(--gold)' }}>Edit</button>
                    <button onClick={() => remove(c)} disabled={busy === c.id}
                      className="hover:underline disabled:opacity-50" style={{ color: '#C9847C' }}>
                      {busy === c.id ? 'Working…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => !submitting && setForm(null)}>
          <div className="w-full max-w-md rounded-2xl border p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                {form.id ? 'Edit Category' : 'New Category'}
              </h2>
              <button onClick={() => setForm(null)} className="btn-ghost" style={{ padding: '0.375rem' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Name *</FieldLabel>
                <input type="text" value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((f) => f ? { ...f, name, slug: slugEdited ? f.slug : slugify(name) } : f)
                  }}
                  placeholder="Digital Planners" className="input-field" />
              </div>
              <div>
                <FieldLabel>Slug</FieldLabel>
                <input type="text" value={form.slug}
                  onChange={(e) => { setForm({ ...form, slug: e.target.value }); setSlugEdited(true) }}
                  placeholder="digital-planners" className="input-field" />
              </div>
              <div>
                <FieldLabel>Icon Name</FieldLabel>
                <input type="text" value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="e.g. Tablet, Wallet, BookOpen" className="input-field" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  A lucide-react icon name shown on the storefront category grid.
                </p>
              </div>
              <div>
                <FieldLabel>Image</FieldLabel>
                {displayImage ? (
                  <div className="relative rounded-xl overflow-hidden border"
                    style={{ aspectRatio: '16/9', borderColor: 'var(--border)' }}>
                    <Image src={displayImage} alt="" fill className="object-cover" unoptimized />
                    <button type="button"
                      onClick={() => { resetImage(); setForm({ ...form, image_url: null }) }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => imageInputRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <ImageIcon size={22} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Click to upload category image
                    </span>
                  </button>
                )}
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    if (imagePreview) URL.revokeObjectURL(imagePreview)
                    setImageFile(f)
                    setImagePreview(f ? URL.createObjectURL(f) : null)
                    e.target.value = ''
                  }} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Featured</span>
                  <Toggle value={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} />
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
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : form.id ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
