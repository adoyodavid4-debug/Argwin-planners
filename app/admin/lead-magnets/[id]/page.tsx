import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import LeadMagnetForm from '../LeadMagnetForm'

export const metadata: Metadata = { title: 'Edit Lead Magnet — Admin', robots: { index: false, follow: false } }

export default async function EditLeadMagnetPage({ params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const [{ data: magnet }, { data: sequences }] = await Promise.all([
    supabase.from('lead_magnets').select('*').eq('id', params.id).single(),
    supabase.from('email_sequences').select('id, name, slug').order('name'),
  ])

  if (!magnet) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Lead Magnet</h1>
      <LeadMagnetForm magnet={magnet} sequences={sequences ?? []} />
    </div>
  )
}
