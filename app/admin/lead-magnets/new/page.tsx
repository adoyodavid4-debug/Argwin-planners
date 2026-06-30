import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import LeadMagnetForm from '../LeadMagnetForm'

export const metadata: Metadata = { title: 'New Lead Magnet — Admin', robots: { index: false, follow: false } }

export default async function NewLeadMagnetPage() {
  const supabase = createServiceRoleClient()
  const { data: sequences } = await supabase
    .from('email_sequences')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Lead Magnet</h1>
      <LeadMagnetForm sequences={sequences ?? []} />
    </div>
  )
}
