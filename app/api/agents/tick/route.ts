// agent-tick — the per-minute dispatcher (masterplan §3.2).
// 1. Dispatch due outbound messages (≤ pace_per_minute per channel).
// 2. Publish due scheduled items (pins).
// 3. Synthesise events from existing tables (order.paid, planner.published)
//    without touching the payment webhooks.
// 4. Fan events out to cross-agent flows (§16).
// 5. Expire stale approvals.
// Protected by CRON_SECRET. Scheduled via Vercel cron (or an external pinger
// on the Hobby plan — Vercel Hobby only allows daily crons).
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { dispatchDueOutbound } from '@/lib/agents/sales/pacing'
import { publishPin } from '@/lib/agents/modules/pinterest'
import { fetchUnprocessed, markProcessed, emitEvent } from '@/lib/agents/events'
import { expireStaleApprovals } from '@/lib/agents/approvals'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const out: Record<string, unknown> = {}

  // Global kill switch stops all outbound work within one tick
  const { data: global } = await supabase
    .from('ag_global_config').select('all_agents_paused').eq('id', 1).single()
  if (global?.all_agents_paused) {
    return NextResponse.json({ ok: true, skipped: 'global kill switch on' })
  }

  // ── 1. Outbound message dispatch (pacing engine) ─────────────────────────
  out.dispatch = await dispatchDueOutbound()

  // ── 2. Publish due scheduled pins ────────────────────────────────────────
  const { data: duePins } = await supabase
    .from('ag_scheduled_items')
    .select('id, title, payload')
    .eq('status', 'scheduled')
    .eq('channel', 'pinterest')
    .lte('scheduled_at', new Date().toISOString())
    .limit(5)

  let pinsPublished = 0
  for (const item of duePins ?? []) {
    const result = await publishPin({
      id: item.id, title: item.title,
      payload: item.payload as { description?: string; alt_text?: string; link?: string; image_source?: string | null },
    })
    await supabase.from('ag_scheduled_items').update({
      status: result.status,
      published_at: result.status === 'published' ? new Date().toISOString() : null,
      error: result.error ?? null,
    }).eq('id', item.id)
    if (result.status === 'published') {
      pinsPublished++
      await emitEvent('pin.published', { item_id: item.id, title: item.title })
    }
  }
  out.pins_published = pinsPublished

  // ── 3. Synthesise events from existing tables ────────────────────────────
  // order.paid: completed orders newer than our high-water mark
  const { data: lastOrderEvent } = await supabase
    .from('ag_events')
    .select('payload')
    .eq('type', 'order.paid')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()
  const orderHighWater = (lastOrderEvent?.payload as { created_at?: string })?.created_at
    ?? new Date(Date.now() - 3_600_000).toISOString()

  const { data: newOrders } = await supabase
    .from('orders')
    .select('id, email, amount_total, created_at')
    .eq('status', 'completed')
    .gt('created_at', orderHighWater)
    .order('created_at', { ascending: true })
    .limit(20)
  for (const order of newOrders ?? []) {
    await emitEvent('order.paid', {
      order_id: order.id, email: order.email,
      amount: order.amount_total, created_at: order.created_at,
    })
  }

  // planner.published: products published since the last planner event
  const { data: lastPlannerEvent } = await supabase
    .from('ag_events')
    .select('payload')
    .eq('type', 'planner.published')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()
  const plannerHighWater = (lastPlannerEvent?.payload as { published_at?: string })?.published_at
    ?? new Date(Date.now() - 86_400_000).toISOString()

  const { data: newPlanners } = await supabase
    .from('products')
    .select('id, title, published_at')
    .eq('status', 'active')
    .gt('published_at', plannerHighWater)
    .order('published_at', { ascending: true })
    .limit(5)
  for (const p of newPlanners ?? []) {
    await emitEvent('planner.published', { planner_id: p.id, title: p.title, published_at: p.published_at })
  }

  // ── 4. Cross-agent event fan-out (§16) ──────────────────────────────────
  const events = await fetchUnprocessed(25)
  const processedIds: number[] = []

  for (const event of events) {
    const payload = event.payload as Record<string, unknown>

    if (event.type === 'order.paid') {
      // sales: mark the lead won when attribution links the order to a lead
      const email = payload.email as string | undefined
      if (email) {
        const { data: lead } = await supabase
          .from('sa_leads').select('id').eq('customer_email', email).limit(1).single()
        if (lead) {
          await supabase.from('sa_leads').update({ status: 'won' }).eq('id', lead.id)
          await supabase.from('sa_attribution').insert({
            lead_id: lead.id, order_id: payload.order_id as string,
            amount: payload.amount as number, channel: 'direct',
          })
        }
      }
      processedIds.push(event.id)
    } else if (event.type === 'planner.published') {
      // Launch Pack: one task bundles the agents' launch work (§16.1)
      await supabase.from('ag_tasks').insert({
        title: `Launch Pack: ${payload.title}`,
        rationale: 'New planner published. The listing, Pinterest, video, email and ads agents will draft launch content on their next runs; review all drafts together in Approvals.',
        expected_impact: 'Coordinated multi-channel launch',
        owner_agent: 'analyst',
        status: 'proposed',
      })
      processedIds.push(event.id)
    } else if (event.type === 'lead.created' || event.type === 'pin.published' || event.type === 'email.clicked') {
      processedIds.push(event.id)  // informational — consumed by KPI reporting
    }
    // 'seasonal.alert' stays unprocessed until the email agent drafts its campaign (email.plan marks it)
  }
  await markProcessed(processedIds)
  out.events_processed = processedIds.length

  // ── 5. Expire stale approvals ────────────────────────────────────────────
  out.approvals_expired = await expireStaleApprovals()

  return NextResponse.json({ ok: true, ...out })
}
