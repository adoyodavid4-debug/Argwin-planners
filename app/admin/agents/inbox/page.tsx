import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import InboxClient from './InboxClient'

export const metadata: Metadata = {
  title: 'Inbox — Agent Command Centre',
  robots: { index: false, follow: false },
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { c?: string }
}) {
  const supabase = createServiceRoleClient()

  const { data: conversations } = await supabase
    .from('sa_conversations')
    .select('id, channel, status, human_takeover, last_message_at, created_at, sa_leads(id, name, market, status, planner_interest)')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50)

  const selectedId = searchParams.c ?? conversations?.[0]?.id ?? null

  let messages: unknown[] = []
  let windowInfo: { expires_at: string } | null = null
  if (selectedId) {
    const [{ data: msgs }, { data: convo }] = await Promise.all([
      supabase
        .from('sa_messages')
        .select('id, direction, body, sent_by, status, template_key, created_at')
        .eq('conversation_id', selectedId)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase.from('sa_conversations').select('lead_id, channel').eq('id', selectedId).single(),
    ])
    messages = msgs ?? []
    if (convo) {
      const { data: win } = await supabase
        .from('sa_windows')
        .select('expires_at')
        .eq('lead_id', convo.lead_id)
        .eq('channel', convo.channel)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .single()
      windowInfo = win
    }
  }

  return (
    <InboxClient
      conversations={(conversations ?? []) as never[]}
      selectedId={selectedId}
      messages={messages as never[]}
      windowExpiresAt={windowInfo?.expires_at ?? null}
    />
  )
}
