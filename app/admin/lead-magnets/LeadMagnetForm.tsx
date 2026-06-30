'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Sequence { id: string; name: string; slug: string }

interface Props {
  magnet?: Record<string, unknown>
  sequences: Sequence[]
}

export default function LeadMagnetForm({ magnet, sequences }: Props) {
  const router = useRouter()
  const isEdit = !!magnet?.id

  const titleI18n = (magnet?.title_i18n as Record<string, string>) ?? {}
  const descI18n  = (magnet?.description_i18n as Record<string, string>) ?? {}

  const [form, setForm] = useState({
    slug:               (magnet?.slug as string) ?? '',
    title_en:           titleI18n.en ?? '',
    title_fr:           titleI18n.fr ?? '',
    description_en:     descI18n.en ?? '',
    description_fr:     descI18n.fr ?? '',
    asset_path:         (magnet?.asset_path as string) ?? '',
    preview_image:      (magnet?.preview_image as string) ?? '',
    og_image:           (magnet?.og_image as string) ?? '',
    pin_image:          (magnet?.pin_image as string) ?? '',
    enroll_sequence_id: (magnet?.enroll_sequence_id as string) ?? '',
    is_active:          (magnet?.is_active as boolean) ?? false,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      slug:               form.slug,
      title_i18n:         { en: form.title_en, fr: form.title_fr },
      description_i18n:   { en: form.description_en, fr: form.description_fr },
      asset_path:         form.asset_path,
      preview_image:      form.preview_image || undefined,
      og_image:           form.og_image || undefined,
      pin_image:          form.pin_image || undefined,
      enroll_sequence_id: form.enroll_sequence_id || null,
      is_active:          form.is_active,
    }

    const url = isEdit ? `/api/admin/lead-magnets/${magnet!.id}` : '/api/admin/lead-magnets'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (res.ok) {
      toast.success(isEdit ? 'Saved!' : 'Created!')
      router.push('/admin/lead-magnets')
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error?.toString() ?? 'Failed to save')
    }
  }

  const field = (label: string, key: keyof typeof form, type: string = 'text', mono?: boolean) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={`w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )

  const textarea = (label: string, key: keyof typeof form) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <textarea
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        rows={3}
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {field('Slug (URL)', 'slug', 'text', true)}
      {field('Title (EN)', 'title_en')}
      {field('Title (FR)', 'title_fr')}
      {textarea('Description (EN)', 'description_en')}
      {textarea('Description (FR)', 'description_fr')}
      {field('Asset path (Supabase Storage)', 'asset_path', 'text', true)}
      {field('Preview image URL', 'preview_image')}
      {field('OG image URL (1200×630)', 'og_image')}
      {field('Pinterest image URL (1000×1500)', 'pin_image')}

      <div>
        <label className="block text-sm font-medium mb-1">Nurture sequence</label>
        <select
          value={form.enroll_sequence_id}
          onChange={(e) => setForm({ ...form, enroll_sequence_id: e.target.value })}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]"
        >
          <option value="">— None —</option>
          {sequences.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="accent-[#C9A84C]" />
        <span className="text-sm font-medium">Active (visible on the site)</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8963e] disabled:opacity-60">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create lead magnet'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--bg-subtle)]">
          Cancel
        </button>
      </div>
    </form>
  )
}
