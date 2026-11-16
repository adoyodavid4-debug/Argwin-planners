import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Content Calendar — Agent Command Centre',
  robots: { index: false, follow: false },
}

const CHANNEL_COLOUR: Record<string, string> = {
  pinterest: '#C9847C', email: '#C9A84C', instagram: '#7B6FAE',
  tiktok: '#3a3530', blog: '#6E7E66', ads: '#8a6d3b',
}

const STATUS_LABEL: Record<string, { label: string; colour: string }> = {
  scheduled:     { label: 'Scheduled',     colour: '#C9A84C' },
  published:     { label: 'Published',     colour: '#6E7E66' },
  ready_to_post: { label: 'Ready to post', colour: '#7B6FAE' },
  failed:        { label: 'Failed',        colour: '#C9847C' },
  cancelled:     { label: 'Cancelled',     colour: 'var(--text-muted)' },
}

export default async function ContentCalendarPage() {
  const supabase = createServiceRoleClient()

  const { data: items } = await supabase
    .from('ag_scheduled_items')
    .select('id, agent_key, channel, item_type, title, scheduled_at, status, published_at')
    .order('scheduled_at', { ascending: true })
    .gte('scheduled_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(200)

  // Group by day
  const byDay = new Map<string, NonNullable<typeof items>>()
  for (const item of items ?? []) {
    const day = item.scheduled_at.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(item)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Content Calendar</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Every scheduled pin, email, reel and article — last 7 days onwards.
        </p>
      </div>

      {byDay.size === 0 ? (
        <div className="p-12 rounded-2xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-4">📅</div>
          <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Nothing scheduled yet</p>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            When you approve pins, reels or campaigns, their scheduled slots appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byDay.entries()).map(([day, dayItems]) => (
            <div key={day}>
              <h2 className="font-semibold text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                {new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <div className="space-y-2">
                {dayItems.map(item => {
                  const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.scheduled
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: CHANNEL_COLOUR[item.channel] ?? 'var(--text-muted)' }}
                      />
                      <span className="text-xs w-12 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs capitalize w-20 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {item.channel}
                      </span>
                      <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `${status.colour}20`, color: status.colour }}
                      >
                        {status.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
