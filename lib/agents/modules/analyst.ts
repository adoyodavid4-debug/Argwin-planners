// Agent 11 — Growth analyst (masterplan §15). Weekly Monday report:
// revenue/orders/AOV by channel + what every agent did and cost + 3-5
// recommended actions as ag_tasks. Anomaly alert on revenue drops. It
// analyses and recommends; it NEVER changes other agents' settings.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { sendAgentEmail } from '../email-send'
import type { AgentModule } from './index'

const REVENUE_DROP_ALERT = parseFloat(process.env.REVENUE_DROP_ALERT ?? '0.4')

export const analystModule: AgentModule = {
  key: 'analyst',

  async plan(ctx) {
    const supabase = createServiceRoleClient()
    const now = new Date()

    // ── Anomaly check (daily): today vs 4-week same-weekday average ───────
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
    const { data: todayOrders } = await supabase
      .from('orders').select('amount_total').eq('status', 'completed').gte('created_at', todayStart)
    const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + (o.amount_total as number), 0)

    let historic = 0
    for (let w = 1; w <= 4; w++) {
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7 * w))
      const dayEnd   = new Date(dayStart.getTime() + 86_400_000)
      const { data } = await supabase
        .from('orders').select('amount_total').eq('status', 'completed')
        .gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString())
      historic += (data ?? []).reduce((s, o) => s + (o.amount_total as number), 0)
    }
    const avg = historic / 4
    // Only meaningful late in the day with a real baseline
    if (avg > 10 && now.getUTCHours() >= 18 && todayRevenue < avg * (1 - REVENUE_DROP_ALERT)) {
      const admin = process.env.ADMIN_EMAIL
      if (admin) {
        await sendAgentEmail({
          to: admin,
          subject: `⚠ Revenue alert: today $${todayRevenue.toFixed(0)} vs 4-week avg $${avg.toFixed(0)}`,
          bodyHtml: `<p>Today's revenue is more than ${REVENUE_DROP_ALERT * 100}% below the 4-week average for this weekday.</p>
            <p>Today: <strong>$${todayRevenue.toFixed(2)}</strong> · 4-week average: <strong>$${avg.toFixed(2)}</strong></p>
            <p>Check checkout errors, integrations and the Agent Command Centre.</p>`,
          kind: 'transactional',
          idempotencyKey: `rev_alert_${todayStart}`,
        })
        ctx.log(`REVENUE ALERT sent (today ${todayRevenue} vs avg ${avg.toFixed(0)})`)
      }
    }

    // ── Weekly report: Mondays only; once per week ─────────────────────────
    if (now.getUTCDay() !== 1) { ctx.log('not Monday — weekly report skipped'); return }
    const weekKey = todayStart.slice(0, 10)
    const { count: already } = await supabase
      .from('ag_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'weekly_report_sent')
      .contains('detail', { week: weekKey })
    if ((already ?? 0) > 0) { ctx.log('weekly report already sent'); return }

    const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const [{ data: weekOrders }, { data: runs }, { data: attribution }] = await Promise.all([
      supabase.from('orders').select('amount_total, created_at').eq('status', 'completed').gte('created_at', weekAgo),
      supabase.from('ag_runs').select('agent_key, cost_usd, status').gte('started_at', weekAgo),
      supabase.from('sa_attribution').select('channel, amount').gte('created_at', weekAgo),
    ])

    const revenue  = (weekOrders ?? []).reduce((s, o) => s + (o.amount_total as number), 0)
    const orderCount = weekOrders?.length ?? 0
    const aov = orderCount ? revenue / orderCount : 0

    const agentCosts: Record<string, number> = {}
    const agentFails: Record<string, number> = {}
    for (const r of runs ?? []) {
      agentCosts[r.agent_key] = (agentCosts[r.agent_key] ?? 0) + (r.cost_usd as number)
      if (r.status === 'failed') agentFails[r.agent_key] = (agentFails[r.agent_key] ?? 0) + 1
    }

    const channelRevenue: Record<string, number> = {}
    for (const a of attribution ?? []) {
      const ch = (a.channel as string) ?? 'direct'
      channelRevenue[ch] = (channelRevenue[ch] ?? 0) + ((a.amount as number) ?? 0)
    }

    const dataBlock = `Week revenue: $${revenue.toFixed(2)} across ${orderCount} orders (AOV $${aov.toFixed(2)}).
Attributed channel revenue: ${JSON.stringify(channelRevenue)}.
Agent costs this week: ${JSON.stringify(agentCosts)}.
Agent failures: ${JSON.stringify(agentFails)}.`

    const result = await callLlm({
      agentKey: 'analyst', runId: ctx.runId,
      systemPrompt: `Write Arwign's weekly growth report. Output ONLY JSON:
{"summary_html": "<the report as clean HTML: h2/p/ul>", "actions": [{"title": "<action>", "rationale": "<why>", "expected_impact": "<impact>", "owner_agent": "sales|email|pinterest|listing|video|ads|seo|support|bundles|trends"}]}
Rules: 3-5 actions; UK spelling; end the report with a footer paragraph documenting the attribution model: "Attribution: last-touch UTM plus lead_id; assisted conversions shown separately."`,
      messages: [{ role: 'user', content: dataBlock }],
      maxTokens: 2000,
    })

    try {
      const report = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as {
        summary_html: string
        actions: Array<{ title: string; rationale: string; expected_impact: string; owner_agent: string }>
      }
      for (const action of report.actions.slice(0, 5)) {
        await supabase.from('ag_tasks').insert({
          title: action.title,
          rationale: action.rationale,
          expected_impact: action.expected_impact,
          owner_agent: action.owner_agent,
          status: 'proposed',
        })
      }
      const admin = process.env.ADMIN_EMAIL
      if (admin) {
        await sendAgentEmail({
          to: admin,
          subject: `Weekly growth report — $${revenue.toFixed(0)} / ${orderCount} orders`,
          bodyHtml: report.summary_html,
          kind: 'transactional',
          idempotencyKey: `weekly_report_${weekKey}`,
        })
      }
      await supabase.from('ag_audit_log').insert({
        agent_key: 'analyst', action: 'weekly_report_sent',
        detail: { week: weekKey, revenue, orders: orderCount, actions: report.actions.length },
      })
      ctx.log(`weekly report sent: $${revenue.toFixed(0)}, ${report.actions.length} actions proposed`)
    } catch {
      ctx.log('weekly report failed JSON parse — skipped')
    }
  },

  async act(_ctx) {
    // Analyses and recommends only — never changes other agents' settings.
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
    const { data: orders } = await supabase
      .from('orders').select('amount_total').eq('status', 'completed').gte('created_at', dayAgo)
    const revenue = (orders ?? []).reduce((s, o) => s + (o.amount_total as number), 0)
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'site', agent_key: 'analyst', metric: 'revenue_24h', value: Math.round(revenue * 100) / 100 }
    )
    ctx.log(`kpi: revenue_24h=${revenue.toFixed(2)}`)
  },
}
