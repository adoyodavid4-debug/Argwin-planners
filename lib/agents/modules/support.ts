// Agent 8 — Support & reviews (masterplan §12). Answers from the knowledge
// base; day-10 neutral review request to EVERY buyer (no incentives, no
// screening); refund requests become tasks for David — never auto-issued.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendAgentEmail } from '../email-send'
import type { AgentModule } from './index'

async function alreadyRequested(orderId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { count } = await supabase
    .from('ag_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'review_request_sent')
    .contains('detail', { order_id: orderId })
  return (count ?? 0) > 0
}

export const supportModule: AgentModule = {
  key: 'support',

  async plan(ctx) {
    const supabase = createServiceRoleClient()

    // ── Day-10 review requests: one neutral ask per buyer, every buyer ─────
    const tenDaysAgo    = new Date(Date.now() - 10 * 86_400_000)
    const elevenDaysAgo = new Date(Date.now() - 11 * 86_400_000)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, email')
      .eq('status', 'completed')
      .gte('created_at', elevenDaysAgo.toISOString())
      .lte('created_at', tenDaysAgo.toISOString())
      .limit(100)

    let requested = 0
    for (const order of orders ?? []) {
      if (!order.email || (await alreadyRequested(order.id))) continue
      const r = await sendAgentEmail({
        to: order.email,
        subject: 'How is your planner working out?',
        bodyHtml: `<p>You've had your Arwign planner for about ten days now.</p>
          <p>If you have a moment, we'd really appreciate an honest review — it helps other planners-people find what works for them.</p>
          <p><a href="https://www.arwignplanners.com/account/orders" style="color:#C9A84C">Leave a review on our site</a>, or on Etsy if you bought there.</p>
          <p>If anything isn't working as expected, just reply to this email and we'll sort it out.</p>`,
        kind: 'transactional',   // service follow-up on the purchase, one per order
        idempotencyKey: `review_req_${order.id}`,
      })
      if (r.ok) {
        await supabase.from('ag_audit_log').insert({
          agent_key: 'support', action: 'review_request_sent', detail: { order_id: order.id },
        })
        requested++
      }
    }
    ctx.log(`review requests: ${requested} sent`)

    // ── Recurring-issue tagging: conversations handed off in the last week ─
    const { data: handoffs } = await supabase
      .from('ag_audit_log')
      .select('detail')
      .eq('action', 'handoff_to_human')
      .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
      .limit(100)

    const reasons: Record<string, number> = {}
    for (const h of handoffs ?? []) {
      const reason = ((h.detail as { reason?: string })?.reason ?? 'unknown').slice(0, 60)
      reasons[reason] = (reasons[reason] ?? 0) + 1
    }
    for (const [reason, count] of Object.entries(reasons)) {
      if (count >= 3) {
        const { count: existing } = await supabase
          .from('ag_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('owner_agent', 'support')
          .ilike('title', `%${reason.slice(0, 30)}%`)
        if ((existing ?? 0) === 0) {
          await supabase.from('ag_tasks').insert({
            title: `Recurring support issue: ${reason}`,
            rationale: `${count} human handoffs in the last 7 days with this reason.`,
            expected_impact: 'Fewer refunds and handoffs once fixed',
            owner_agent: 'support',
            status: 'proposed',
          })
          ctx.log(`tagged recurring issue: ${reason} (${count}×)`)
        }
      }
    }
  },

  async act(_ctx) {
    // The support agent's live-answer path runs through the sales inbox
    // (handoffs) and the KB; it never issues refunds. Nothing to execute here.
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { count: requests } = await supabase
      .from('ag_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'review_request_sent')
      .gte('created_at', weekAgo)
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'support', agent_key: 'support', metric: 'review_requests_7d', value: requests ?? 0 }
    )
    ctx.log(`kpi: review_requests_7d=${requests ?? 0}`)
  },
}
