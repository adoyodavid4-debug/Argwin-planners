import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// POST (multipart) — upload a memory photo to the public `moment-media` bucket.
// Auth is checked with the user client; the upload uses the service role (which
// bypasses storage RLS), namespacing the object under the user's id.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 }) }
  const file = form.get('file') as File | null
  if (!file || file.size === 0) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be under 8 MB.' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG, WEBP or GIF image.' }, { status: 400 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${user.id}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createServiceRoleClient()
  const { error } = await admin.storage.from('moment-media').upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) {
    console.error('[moments] upload', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
  const { data: { publicUrl } } = admin.storage.from('moment-media').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
