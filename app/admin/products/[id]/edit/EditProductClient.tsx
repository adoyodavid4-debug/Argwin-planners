'use client'

import { useState, useRef, DragEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Upload, X, ImageIcon, FileText, Loader2, Plus, Folder,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface DbCategory { id: string; name: string; slug: string; icon: string | null }

interface PlannerFileInfo { url: string; size_mb: number; name: string }

interface ProductRow {
  id: string
  title: string
  slug: string
  description: string | null
  category_id: string | null
  status: string
  delivery_type: string
  product_type?: string
  fulfillment_options?: string
  price: number
  compare_price: number | null
  images: string[]
  thumbnail: string | null
  planner_files: Partial<Record<'a4' | 'a5' | 'us_letter', PlannerFileInfo>>
  file_formats: string[]
  page_count: number | null
  meta_title: string | null
  meta_description: string | null
  is_featured: boolean
  is_bestseller: boolean
  is_new: boolean
  tags: string[]
  display_order: number | null
  categories?: { id: string; name: string; slug: string } | null
}

const DELIVERY_TYPES = [
  { value: 'digital',   label: 'Digital Download' },
  { value: 'printable', label: 'Printable PDF' },
  { value: 'bundle',    label: 'Bundle' },
]
const PRODUCT_TYPES = [
  { value: 'planner',  label: 'Planner' },
  { value: 'notebook', label: 'Notebook' },
]
const FULFILLMENT_OPTIONS = [
  { value: 'digital', label: 'Digital only' },
  { value: 'print',   label: 'Print only (POD)' },
  { value: 'both',    label: 'Digital + Print (POD)' },
]
const STATUS_OPTIONS = [
  { value: 'draft',    label: 'Draft' },
  { value: 'active',   label: 'Active (Published)' },
  { value: 'archived', label: 'Archived' },
]
const FILE_FORMATS = ['PDF', 'GoodNotes', 'Notability', 'Xodo', 'OneNote', 'Zip']

const PLANNER_SIZES = [
  { key: 'a4',        label: 'A4 Planner' },
  { key: 'a5',        label: 'A5 Planner' },
  { key: 'us_letter', label: 'US Letter Sized Planner' },
] as const
type PlannerSizeKey = (typeof PLANNER_SIZES)[number]['key']

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

function PlannerFileSlot({
  label, current, file, removed, onSelect, onClearNew, onRemoveCurrent, onRestore,
}: {
  label: string
  current: PlannerFileInfo | null
  file: File | null
  removed: boolean
  onSelect: (f: File | null) => void
  onClearNew: () => void
  onRemoveCurrent: () => void
  onRestore: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>

      {/* Newly selected replacement */}
      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border"
          style={{ borderColor: 'var(--gold)' }}>
          <FileText size={20} style={{ color: 'var(--gold)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {file.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {(file.size / (1024 * 1024)).toFixed(1)} MB · new upload
            </p>
          </div>
          <button type="button" onClick={onClearNew} className="btn-ghost" style={{ padding: '0.375rem' }}>
            <X size={14} />
          </button>
        </div>
      ) : current && !removed ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border"
          style={{ borderColor: 'var(--border)' }}>
          <FileText size={20} style={{ color: 'var(--gold)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {current.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {current.size_mb} MB · current file
            </p>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="text-xs font-semibold hover:underline flex-shrink-0" style={{ color: 'var(--gold)' }}>
            Replace
          </button>
          <button type="button" onClick={onRemoveCurrent} className="btn-ghost" style={{ padding: '0.375rem' }}
            aria-label={`Remove ${label}`}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-1.5 transition-colors"
            style={{ borderColor: 'var(--border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <Upload size={20} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Upload {label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              PDF, ZIP, GoodNotes, OneNote
            </span>
          </button>
          {removed && current && (
            <button type="button" onClick={onRestore}
              className="text-xs mt-1.5 hover:underline" style={{ color: 'var(--text-muted)' }}>
              Removed &ldquo;{current.name}&rdquo; — undo
            </button>
          )}
        </div>
      )}
      <input ref={inputRef} type="file"
        accept=".pdf,.zip,.goodnotes,.one,.xopp" className="hidden"
        onChange={(e) => { onSelect(e.target.files?.[0] ?? null); e.target.value = '' }} />
    </div>
  )
}

export default function EditProductClient({
  product, categories,
}: {
  product: ProductRow
  categories: DbCategory[]
}) {
  const router = useRouter()
  const imageInputRef = useRef<HTMLInputElement>(null)

  // ── form state (prefilled) ─────────────────────────────────────────────
  const [title,         setTitle]         = useState(product.title)
  const [slug,          setSlug]          = useState(product.slug)
  const [slugEdited,    setSlugEdited]    = useState(true)
  const [description,   setDescription]   = useState(product.description ?? '')
  const [categorySlug,       setCategorySlug]       = useState(product.categories?.slug ?? '')
  const [deliveryType,       setDeliveryType]       = useState(product.delivery_type ?? 'digital')
  const [productType,        setProductType]        = useState(product.product_type ?? 'planner')
  const [fulfillmentOptions, setFulfillmentOptions] = useState(product.fulfillment_options ?? 'digital')
  const [status,             setStatus]             = useState(product.status ?? 'draft')
  const [price,         setPrice]         = useState(String(product.price ?? ''))
  const [comparePrice,  setComparePrice]  = useState(product.compare_price != null ? String(product.compare_price) : '')
  const [formats,       setFormats]       = useState<string[]>(product.file_formats ?? [])
  const [pageCount,     setPageCount]     = useState(product.page_count != null ? String(product.page_count) : '')
  const [displayOrder,  setDisplayOrder]  = useState(product.display_order != null ? String(product.display_order) : '')
  const [tags,          setTags]          = useState((product.tags ?? []).join(', '))
  const [metaTitle,     setMetaTitle]     = useState(product.meta_title ?? '')
  const [metaDesc,      setMetaDesc]      = useState(product.meta_description ?? '')
  const [isFeatured,    setIsFeatured]    = useState(!!product.is_featured)
  const [isBestseller,  setIsBestseller]  = useState(!!product.is_bestseller)
  const [isNew,         setIsNew]         = useState(!!product.is_new)

  // ── image state ────────────────────────────────────────────────────────
  const [existingImages, setExistingImages] = useState<string[]>(product.images ?? [])
  const [newImageFiles,  setNewImageFiles]  = useState<File[]>([])
  const [newPreviews,    setNewPreviews]    = useState<string[]>([])
  const [dragging,       setDragging]       = useState(false)

  // ── planner file state ─────────────────────────────────────────────────
  const currentFiles = product.planner_files ?? {}
  const [newPlannerFiles, setNewPlannerFiles] = useState<Record<PlannerSizeKey, File | null>>({
    a4: null, a5: null, us_letter: null,
  })
  const [removedFiles, setRemovedFiles] = useState<Record<PlannerSizeKey, boolean>>({
    a4: false, a5: false, us_letter: false,
  })

  const [submitting, setSubmitting] = useState(false)

  const handleTitle = (v: string) => {
    setTitle(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  const addImages = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => {
      setNewImageFiles((p) => [...p, f])
      setNewPreviews((p) => [...p, URL.createObjectURL(f)])
    })
  }

  const removeExistingImage = (i: number) =>
    setExistingImages((p) => p.filter((_, j) => j !== i))

  const removeNewImage = (i: number) => {
    URL.revokeObjectURL(newPreviews[i])
    setNewImageFiles((p) => p.filter((_, j) => j !== i))
    setNewPreviews((p) => p.filter((_, j) => j !== i))
  }

  const toggleFormat = (fmt: string) =>
    setFormats((p) => p.includes(fmt) ? p.filter((f) => f !== fmt) : [...p, fmt])

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    addImages(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (!title.trim())                      { toast.error('Title is required');        return }
    if (!price || isNaN(parseFloat(price))) { toast.error('Valid price is required');  return }
    if (!categorySlug)                      { toast.error('Please select a category'); return }

    setSubmitting(true)
    const fd = new FormData()
    fd.append('title',            title.trim())
    fd.append('slug',             slug || slugify(title))
    fd.append('description',      description)
    fd.append('category_slug',    categorySlug)
    fd.append('delivery_type',       deliveryType)
    fd.append('product_type',        productType)
    fd.append('fulfillment_options', fulfillmentOptions)
    fd.append('status',           status)
    fd.append('price',            price)
    fd.append('compare_price',    comparePrice)
    fd.append('page_count',       pageCount)
    fd.append('display_order',    displayOrder)
    fd.append('is_featured',      String(isFeatured))
    fd.append('is_bestseller',    String(isBestseller))
    fd.append('is_new',           String(isNew))
    fd.append('tags',             tags)
    fd.append('meta_title',       metaTitle)
    fd.append('meta_description', metaDesc)
    formats.forEach((f) => fd.append('file_formats', f))
    if (formats.length === 0) fd.append('file_formats', '')

    fd.append('existing_images', JSON.stringify(existingImages))
    newImageFiles.forEach((f) => fd.append('images', f))

    PLANNER_SIZES.forEach(({ key }) => {
      const f = newPlannerFiles[key]
      if (f) fd.append(`file_${key}`, f)
      if (removedFiles[key] && !f) fd.append(`remove_file_${key}`, 'true')
    })

    try {
      const res  = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast.success('Product updated')
      router.push('/admin/products')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCategory = categories.find((c) => c.slug === categorySlug)

  const flags = [
    { label: 'New Arrival',  value: isNew,        onChange: setIsNew },
    { label: 'Featured',     value: isFeatured,   onChange: setIsFeatured },
    { label: 'Best Seller',  value: isBestseller, onChange: setIsBestseller },
  ]

  const totalImages = existingImages.length + newPreviews.length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/products" className="btn-ghost flex-shrink-0" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-lg leading-none truncate" style={{ color: 'var(--text-primary)' }}>
                {title || 'Edit Product'}
              </h1>
              {selectedCategory && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                  <Folder size={11} />
                  {selectedCategory.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="btn-primary" style={{ padding: '0.55rem 1.5rem', fontSize: '0.8rem' }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <Card title="Basic Info">
            <div className="space-y-4">
              <div>
                <FieldLabel>Title *</FieldLabel>
                <input type="text" value={title} onChange={(e) => handleTitle(e.target.value)}
                  placeholder="e.g. Daily Student Planner 2025"
                  className="input-field" />
              </div>
              <div>
                <FieldLabel>Product Number</FieldLabel>
                <input
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  placeholder="Auto-assigned if blank"
                  className="input-field"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Shown as a prefix on the card, e.g. &ldquo;4. Planner Title&rdquo;
                </p>
              </div>
              <div>
                <FieldLabel>URL Slug</FieldLabel>
                <div className="flex items-center border rounded-xl overflow-hidden"
                  style={{ borderWidth: '1.5px', borderColor: 'var(--border)' }}>
                  <span className="pl-4 pr-1 text-xs flex-shrink-0 select-none"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-jost)' }}>
                    /shop/
                  </span>
                  <input type="text" value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
                    placeholder="daily-student-planner-2025"
                    className="flex-1 bg-transparent outline-none py-3.5 pr-4 text-sm"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }} />
                </div>
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your planner — what's included, who it's for, key features..."
                  className="input-field" rows={5} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </Card>

          {/* Category */}
          <Card title="Category *">
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Select the category this planner belongs to. It will appear on the shop under that category.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const active = categorySlug === cat.slug
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setCategorySlug(active ? '' : cat.slug)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200"
                    style={{
                      borderColor: active ? 'var(--gold)' : 'var(--border)',
                      background:  active ? 'rgba(201,168,76,0.09)' : 'transparent',
                    }}
                  >
                    <Folder
                      size={15}
                      style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', flexShrink: 0 }}
                    />
                    <span className="text-xs font-medium leading-tight"
                      style={{
                        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-jost)',
                      }}>
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Product type + Fulfillment + Delivery + Status */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <FieldLabel>Product Type</FieldLabel>
                <select value={productType} onChange={(e) => setProductType(e.target.value)} className="input-field">
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Fulfillment</FieldLabel>
                <select value={fulfillmentOptions} onChange={(e) => setFulfillmentOptions(e.target.value)} className="input-field">
                  {FULFILLMENT_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Delivery Type</FieldLabel>
                <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className="input-field">
                  {DELIVERY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* SEO */}
          <Card title="SEO & Tags">
            <div className="space-y-4">
              <div>
                <FieldLabel>Meta Title</FieldLabel>
                <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Leave blank to use the product title" className="input-field" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {metaTitle.length}/60 characters
                </p>
              </div>
              <div>
                <FieldLabel>Meta Description</FieldLabel>
                <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder="150–160 characters recommended for search engines"
                  className="input-field" rows={3} style={{ resize: 'vertical' }} />
                <p className="text-xs mt-1"
                  style={{ color: metaDesc.length > 160 ? '#C9847C' : 'var(--text-muted)' }}>
                  {metaDesc.length}/160 characters
                </p>
              </div>
              <div>
                <FieldLabel>Tags (comma-separated)</FieldLabel>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder="digital planner, GoodNotes, productivity, daily" className="input-field" />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column ─────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Pricing */}
          <Card title="Pricing">
            <div className="space-y-3">
              <div>
                <FieldLabel>Price (USD) *</FieldLabel>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-sm"
                    style={{ color: 'var(--text-muted)' }}>$</span>
                  <input type="number" min="0" step="0.01" value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="9.99" className="input-field pl-8" />
                </div>
              </div>
              <div>
                <FieldLabel>Compare-at Price</FieldLabel>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-sm"
                    style={{ color: 'var(--text-muted)' }}>$</span>
                  <input type="number" min="0" step="0.01" value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    placeholder="14.99" className="input-field pl-8" />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Shown as strike-through &ldquo;was&rdquo; price
                </p>
              </div>
            </div>
          </Card>

          {/* Product Images */}
          <Card title="Product Images">
            {totalImages > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {existingImages.map((src, i) => (
                  <div key={`cur-${src}`} className="relative rounded-xl overflow-hidden border"
                    style={{ aspectRatio: '1', borderColor: 'var(--border)' }}>
                    <Image src={src} alt="" fill className="object-cover" />
                    <button type="button" onClick={() => removeExistingImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                      <X size={10} />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded font-bold text-white"
                        style={{ fontSize: '9px', background: 'var(--gold)' }}>
                        COVER
                      </span>
                    )}
                  </div>
                ))}
                {newPreviews.map((src, i) => (
                  <div key={`new-${i}`} className="relative rounded-xl overflow-hidden border"
                    style={{ aspectRatio: '1', borderColor: 'var(--gold)' }}>
                    <Image src={src} alt="" fill className="object-cover" />
                    <button type="button" onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                      <X size={10} />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded font-bold text-white"
                      style={{ fontSize: '9px', background: 'rgba(0,0,0,0.65)' }}>
                      NEW
                    </span>
                  </div>
                ))}
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed flex items-center justify-center transition-colors"
                  style={{ aspectRatio: '1', borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <Plus size={20} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            )}

            {totalImages === 0 && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 cursor-pointer transition-all"
                style={{
                  borderColor: dragging ? 'var(--gold)' : 'var(--border)',
                  background:  dragging ? 'rgba(201,168,76,0.04)' : 'transparent',
                }}>
                <ImageIcon size={24} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Drag &amp; drop or click to upload
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  JPG, PNG, WebP · First image = cover
                </span>
              </div>
            )}

            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { addImages(e.target.files); e.target.value = '' }} />
          </Card>

          {/* Planner Files — one per paper size */}
          <Card title="Planner Files">
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Current files are shown below. Upload a new file to replace a size, or remove one entirely.
            </p>
            <div className="space-y-4">
              {PLANNER_SIZES.map(({ key, label }) => (
                <PlannerFileSlot
                  key={key}
                  label={label}
                  current={currentFiles[key] ?? null}
                  file={newPlannerFiles[key]}
                  removed={removedFiles[key]}
                  onSelect={(f) => setNewPlannerFiles((p) => ({ ...p, [key]: f }))}
                  onClearNew={() => setNewPlannerFiles((p) => ({ ...p, [key]: null }))}
                  onRemoveCurrent={() => setRemovedFiles((p) => ({ ...p, [key]: true }))}
                  onRestore={() => setRemovedFiles((p) => ({ ...p, [key]: false }))}
                />
              ))}
            </div>
          </Card>

          {/* File Details */}
          <Card title="File Details">
            <div className="space-y-4">
              <div>
                <FieldLabel>Compatible Apps</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {FILE_FORMATS.map((fmt) => (
                    <button key={fmt} type="button" onClick={() => toggleFormat(fmt)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200"
                      style={{
                        borderColor: formats.includes(fmt) ? 'var(--gold)' : 'var(--border)',
                        background:  formats.includes(fmt) ? 'rgba(201,168,76,0.1)' : 'transparent',
                        color:       formats.includes(fmt) ? 'var(--gold)' : 'var(--text-secondary)',
                        fontFamily:  'var(--font-jost)',
                      }}>
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>Page Count</FieldLabel>
                <input type="number" min="1" value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  placeholder="e.g. 120" className="input-field" />
              </div>
            </div>
          </Card>

          {/* Flags */}
          <Card title="Product Flags">
            <div className="space-y-3">
              {flags.map(({ label, value, onChange }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jost)' }}>
                    {label}
                  </span>
                  <Toggle value={value} onChange={onChange} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
