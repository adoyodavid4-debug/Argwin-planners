// lib/admin/uploadFiles.ts
// Client-side helpers that upload product media DIRECTLY to Supabase Storage
// using short-lived signed upload URLs minted by /api/admin/uploads.
//
// WHY: Vercel serverless functions cap the request body at 4.5 MB, so routing
// large planner PDFs through /api/admin/products returns a 413 ("Request Entity
// Too Large"). Uploading straight from the browser to Supabase skips the
// function entirely, so file size is limited only by the Storage bucket config.
import { createClient } from '@/lib/supabase/client'

export type PlannerSizeKey = 'a4' | 'a5' | 'us_letter'

export interface PlannerFileInfo { url: string; size_mb: number; name: string }

interface SignReqItem { kind: 'image' | 'planner'; size?: PlannerSizeKey; ext: string }
interface SignResItem { bucket: string; path: string; token: string; publicUrl?: string }

function extOf(name: string, fallback: string): string {
  const e = name.split('.').pop()
  return e && e.length <= 5 ? e.toLowerCase() : fallback
}

async function mintUploadTargets(slug: string, items: SignReqItem[]): Promise<SignResItem[]> {
  const res = await fetch('/api/admin/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, items }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not prepare the upload')
  return (data.uploads ?? []) as SignResItem[]
}

/**
 * Upload product images in order. Returns their public URLs (same order),
 * ready to store in products.images (images[0] is the cover/thumbnail).
 */
export async function uploadProductImages(slug: string, files: File[]): Promise<string[]> {
  const real = files.filter((f) => f && f.size > 0)
  if (!real.length) return []
  const targets = await mintUploadTargets(slug, real.map((f) => ({ kind: 'image', ext: extOf(f.name, 'jpg') })))
  const supabase = createClient()
  const urls: string[] = []
  for (let i = 0; i < real.length; i++) {
    const t = targets[i]
    if (!t) throw new Error('The upload could not be prepared for every image')
    const { error } = await supabase.storage
      .from(t.bucket)
      .uploadToSignedUrl(t.path, t.token, real[i], { contentType: real[i].type || undefined })
    if (error) throw new Error(`Image upload failed: ${error.message}`)
    if (t.publicUrl) urls.push(t.publicUrl)
  }
  return urls
}

/**
 * Upload one planner file per paper size. Returns a map keyed by size, shaped
 * for products.planner_files. Stores the bucket-relative PATH (private bucket),
 * which is what the download route signs.
 */
export async function uploadPlannerFiles(
  slug: string,
  files: Partial<Record<PlannerSizeKey, File | null>>,
): Promise<Record<string, PlannerFileInfo>> {
  const entries = (Object.entries(files) as [PlannerSizeKey, File | null][])
    .filter((e): e is [PlannerSizeKey, File] => !!e[1] && e[1].size > 0)
  if (!entries.length) return {}
  const targets = await mintUploadTargets(
    slug,
    entries.map(([size, f]) => ({ kind: 'planner', size, ext: extOf(f.name, 'pdf') })),
  )
  const supabase = createClient()
  const out: Record<string, PlannerFileInfo> = {}
  for (let i = 0; i < entries.length; i++) {
    const [size, file] = entries[i]
    const t = targets[i]
    if (!t) throw new Error('The upload could not be prepared for every file')
    const { error } = await supabase.storage
      .from(t.bucket)
      .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type || undefined })
    if (error) throw new Error(`File upload failed (${size.toUpperCase()}): ${error.message}`)
    out[size] = { url: t.path, size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)), name: file.name }
  }
  return out
}
