import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SequenceForm, { type SequenceData } from '../SequenceForm'

export const metadata: Metadata = {
  title: 'Edit Sequence — Admin',
  robots: { index: false, follow: false },
}

export default async function EditSequencePage({ params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const { data: sequence } = await supabase
    .from('email_sequences')
    .select('*, email_sequence_steps(*)')
    .eq('id', params.id)
    .single()

  if (!sequence) notFound()

  return <SequenceForm sequence={sequence as SequenceData} />
}
