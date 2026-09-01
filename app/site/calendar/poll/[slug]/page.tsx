import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PollVoteClient from './PollVoteClient'

export const metadata: Metadata = { title: 'Vote · Arwign Calendar' }

export default async function PublicPollPage({ params }: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: poll } = await supabase
    .from('meeting_polls')
    .select('id, slug, title, description, location, duration_min, timezone, status, final_start_at')
    .eq('slug', params.slug)
    .maybeSingle()
  if (!poll) notFound()

  const { data: options } = await supabase
    .from('poll_options').select('id, start_at, end_at').eq('poll_id', poll.id).order('start_at')

  return <PollVoteClient poll={poll} options={options ?? []} />
}
