'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ImageIcon, X, Eye, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import Markdown from '@/components/blog/Markdown'

export interface BlogFormPost {
  id?: string
  title: string
  slug: string
  excerpt: string | null
  body: string | null
  cover_image: string | null
  category: string | null
  tags: string[]
  read_time_mins: number | null
  status: string
}

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
]

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase mb-1.5"
      style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}>
      {children}
    </p>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <h2 className="text-sm font-semibold mb-5"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function BlogPostForm({ post }: { post?: BlogFormPost }) {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!post?.id

  const [title,      setTitle]      = useState(post?.title ?? '')
  const [slug,       setSlug]       = useState(post?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(isEdit)
  const [excerpt,    setExcerpt]    = useState(post?.excerpt ?? '')
  const [body,       setBody]       = useState(post?.body ?? '')
  const [category,   setCategory]   = useState(post?.category ?? '')
  const [tags,       setTags]       = useState((post?.tags ?? []).join(', '))
  const [readMins,   setReadMins]   = useState(post?.read_time_mins != null ? String(post.read_time_mins) : '')
  const [status,     setStatus]     = useState(post?.status ?? 'draft')

  const [existingCover, setExistingCover] = useState(post?.cover_image ?? null)
  const [coverFile,     setCoverFile]     = useState<File | null>(null)
  const [coverPreview,  setCoverPreview]  = useState<string | null>(null)

  const [previewMode, setPreviewMode] = useState(false)
  const [submitting,  setSubmitting]  = useState(false)

  const handleTitle = (v: string) => {
    setTitle(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  const selectCover = (f: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(f)
    setCoverPreview(f ? URL.createObjectURL(f) : null)
  }

  const handleSubmit = async (publishOverride?: string) => {
    if (!title.trim()) { toast.error('Title is required'); return }

    setSubmitting(true)
    const fd = new FormData()
    fd.append('title',          title.trim())
    fd.append('slug',           slug || slugify(title))
    fd.append('excerpt',        excerpt)
    fd.append('body',           body)
    fd.append('category',       category)
    fd.append('tags',           tags)
    fd.append('read_time_mins', readMins)
    fd.append('status',         publishOverride ?? status)
    if (coverFile) fd.append('cover_image', coverFile)
    if (isEdit && !existingCover && !coverFile) fd.append('remove_cover', 'true')

    try {
      const res = await fetch(
        isEdit ? `/api/admin/blog/${post!.id}` : '/api/admin/blog',
        { method: isEdit ? 'PATCH' : 'POST', body: fd }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast.success(isEdit ? 'Post updated' : 'Post created')
      router.push('/admin/blog')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const coverSrc = coverPreview ?? existingCover

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/blog" className="btn-ghost flex-shrink-0" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-display text-lg leading-none truncate" style={{ color: 'var(--text-primary)' }}>
              {title || (isEdit ? 'Edit Post' : 'New Post')}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => handleSubmit()} disabled={submitting}
              className="btn-outline" style={{ padding: '0.55rem 1.2rem', fontSize: '0.8rem' }}>
              Save
            </button>
            {status !== 'published' && (
              <button type="button" onClick={() => handleSubmit('published')} disabled={submitting}
                className="btn-primary" style={{ padding: '0.55rem 1.5rem', fontSize: '0.8rem' }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Publish'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Post Details">
            <div className="space-y-4">
              <div>
                <FieldLabel>Title *</FieldLabel>
                <input type="text" value={title} onChange={(e) => handleTitle(e.target.value)}
                  placeholder="e.g. 10 Digital Planning Tips Every Beginner Should Know"
                  className="input-field" />
              </div>
              <div>
                <FieldLabel>URL Slug</FieldLabel>
                <div className="flex items-center border rounded-xl overflow-hidden"
                  style={{ borderWidth: '1.5px', borderColor: 'var(--border)' }}>
                  <span className="pl-4 pr-1 text-xs flex-shrink-0 select-none"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-jost)' }}>
                    /blog/
                  </span>
                  <input type="text" value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
                    placeholder="digital-planning-tips"
                    className="flex-1 bg-transparent outline-none py-3.5 pr-4 text-sm"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }} />
                </div>
              </div>
              <div>
                <FieldLabel>Excerpt</FieldLabel>
                <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short summary shown on the blog listing and in search results..."
                  className="input-field" rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </Card>

          <Card title="Content (Markdown)">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setPreviewMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background:  !previewMode ? 'var(--gold)' : 'transparent',
                  color:       !previewMode ? '#fff' : 'var(--text-secondary)',
                  borderColor: !previewMode ? 'var(--gold)' : 'var(--border)',
                }}>
                <Pencil size={12} /> Write
              </button>
              <button type="button" onClick={() => setPreviewMode(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background:  previewMode ? 'var(--gold)' : 'transparent',
                  color:       previewMode ? '#fff' : 'var(--text-secondary)',
                  borderColor: previewMode ? 'var(--gold)' : 'var(--border)',
                }}>
                <Eye size={12} /> Preview
              </button>
            </div>

            {previewMode ? (
              <div className="rounded-xl border p-6 min-h-[300px]"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                {body.trim()
                  ? <Markdown content={body} />
                  : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing to preview yet.</p>}
              </div>
            ) : (
              <>
                <textarea value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder={'Write your article in markdown...\n\n## A heading\n\nA paragraph with **bold** and *italic* text.\n\n- A list item\n- Another item'}
                  className="input-field font-mono text-sm" rows={18} style={{ resize: 'vertical' }} />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Supports ## headings, **bold**, *italic*, `code`, [links](url), - lists, 1. numbered lists and &gt; quotes.
                </p>
              </>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-4">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Productivity" className="input-field" />
              </div>
              <div>
                <FieldLabel>Read Time (minutes)</FieldLabel>
                <input type="number" min="1" value={readMins}
                  onChange={(e) => setReadMins(e.target.value)}
                  placeholder="e.g. 6" className="input-field" />
              </div>
              <div>
                <FieldLabel>Tags (comma-separated)</FieldLabel>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder="planning, productivity, iPad" className="input-field" />
              </div>
            </div>
          </Card>

          <Card title="Cover Image">
            {coverSrc ? (
              <div className="relative rounded-xl overflow-hidden border"
                style={{ aspectRatio: '16/9', borderColor: 'var(--border)' }}>
                <Image src={coverSrc} alt="" fill className="object-cover" unoptimized />
                <button type="button"
                  onClick={() => { selectCover(null); setExistingCover(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => coverInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-2 transition-colors"
                style={{ borderColor: 'var(--border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <ImageIcon size={24} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Click to upload cover image
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  JPG, PNG, WebP · 16:9 recommended
                </span>
              </button>
            )}
            {coverSrc && (
              <button type="button" onClick={() => coverInputRef.current?.click()}
                className="text-xs font-semibold mt-3 hover:underline" style={{ color: 'var(--gold)' }}>
                Replace image
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { selectCover(e.target.files?.[0] ?? null); e.target.value = '' }} />
          </Card>
        </div>
      </div>
    </div>
  )
}
