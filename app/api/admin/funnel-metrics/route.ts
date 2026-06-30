import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceRoleClient()

  const [
    { count: totalOptins },
    { count: confirmed },
    { count: unsubscribed },
    { count: bounced },
    { data: byMagnet },
    { data: eventCounts },
  ] = await Promise.all([
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'bounced'),
    supabase.from('subscribers')
      .select('source_lead_magnet_id, lead_magnets(title_i18n), status')
      .not('source_lead_magnet_id', 'is', null),
    supabase.from('email_events').select('type').limit(5000),
  ])

  const confirmRate = totalOptins ? ((confirmed ?? 0) / totalOptins * 100).toFixed(1) : '0'
  const unsubRate   = confirmed   ? ((unsubscribed ?? 0) / (confirmed ?? 1) * 100).toFixed(1) : '0'

  // Aggregate event types
  const eventSummary: Record<string, number> = {}
  for (const e of (eventCounts ?? [])) {
    eventSummary[e.type] = (eventSummary[e.type] ?? 0) + 1
  }

  // Aggregate by lead magnet
  const magnetMap: Record<string, { title: string; total: number; confirmed: number }> = {}
  for (const row of (byMagnet ?? []) as unknown as Array<{ source_lead_magnet_id: string; lead_magnets: { title_i18n: Record<string, string> } | null; status: string }>) {
    const id = row.source_lead_magnet_id
    if (!magnetMap[id]) {
      magnetMap[id] = {
        title: row.lead_magnets?.title_i18n?.['en'] ?? 'Unknown',
        total: 0,
        confirmed: 0,
      }
    }
    magnetMap[id].total++
    if (row.status === 'confirmed') magnetMap[id].confirmed++
  }

  return NextResponse.json({
    totalOptins: totalOptins ?? 0,
    confirmed:   confirmed   ?? 0,
    confirmRate,
    unsubscribed: unsubscribed ?? 0,
    unsubRate,
    bounced:     bounced      ?? 0,
    eventSummary,
    byMagnet: Object.values(magnetMap),
  })
}
