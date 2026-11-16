import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import EntryPointsClient from './EntryPointsClient'

export const metadata: Metadata = {
  title: 'Entry Points — Agent Command Centre',
  robots: { index: false, follow: false },
}

export default async function EntryPointsPage() {
  const supabase = createServiceRoleClient()
  const { data: planners } = await supabase
    .from('products')
    .select('id, title, slug')
    .eq('status', 'active')
    .order('download_count', { ascending: false })
    .limit(100)

  const waNumber = process.env.WHATSAPP_DISPLAY_NUMBER ?? ''  // e.g. 14155550123 (no +)

  return <EntryPointsClient planners={planners ?? []} waNumber={waNumber} />
}
