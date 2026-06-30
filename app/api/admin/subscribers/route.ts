import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '50'))
  const status   = searchParams.get('status')
  const q        = searchParams.get('q')

  const from = (page - 1) * pageSize
  const to   = from + pageSize - 1

  const supabase = createServiceRoleClient()
  let query = supabase
    .from('subscribers')
    .select('id, email, status, locale, confirmed_at, created_at, tags, source_lead_magnet_id, lead_magnets(title_i18n)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (q) query = query.ilike('email', `%${q}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}
