// Agent 6 — Ads manager (masterplan §10). Drafts Meta campaigns → Approvals
// (ALWAYS — spending). Monitors spend vs caps daily; the only automatic
// action permitted is pausing an ad set.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { createApproval } from '../approvals'
import { listActivePlanners, plannerFacts } from '../catalogue'
import type { AgentModule } from './index'

const GRAPH = 'https://graph.facebook.com/v21.0'

export const adsModule: AgentModule = {
  key: 'ads',

  async plan(ctx) {
    const supabase = createServiceRoleClient()

    // Draft at most one campaign at a time
    const { count: open } = await supabase
      .from('ag_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('agent_key', 'ads')
      .eq('status', 'pending')
    if ((open ?? 0) > 0) { ctx.log('campaign draft already pending'); return }

    const planners = await listActivePlanners(5)
    const target = planners[0]
    if (!target) { ctx.log('no active planners'); return }

    const dailyCap = process.env.ADS_DAILY_CAP_USD ?? '{{ADS_DAILY_CAP_USD}}'
    const monthlyCap = process.env.ADS_MONTHLY_CAP_USD ?? '{{ADS_MONTHLY_CAP_USD}}'

    const result = await callLlm({
      agentKey: 'ads', runId: ctx.runId,
      systemPrompt: `Draft a Meta ads campaign for a digital planner. Output ONLY JSON:
{"objective": "click_to_whatsapp|conversions", "headline": "<40 chars>", "primary_text": "<125 chars>", "description": "<30 chars>", "audience": "<interest-based audience description for US+UK>", "cta": "Shop Now|Learn More|Send Message"}
Brand voice, UK spelling, no invented discounts or scarcity.`,
      messages: [{ role: 'user', content: plannerFacts(target) }],
      maxTokens: 500,
    })

    try {
      const draft = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as Record<string, string>
      await createApproval({
        agentKey: 'ads', actionType: 'create_ad',   // spending → always needs approval
        title: `Meta campaign: ${target.title}`,
        preview: {
          planner_id: target.id,
          ...draft,
          daily_budget_usd: dailyCap,
          monthly_cap_usd: monthlyCap,
          markets: 'US, UK',
          note: 'Campaign will be created in PAUSED state; David activates it in Ads Manager.',
        },
      })
      ctx.log(`campaign drafted for ${target.title} (needs approval — spending)`)
    } catch {
      ctx.log('campaign draft failed JSON parse — skipped')
    }
  },

  async act(ctx) {
    // Approved campaigns: we do NOT auto-create live spend. Even after
    // approval the campaign is created PAUSED (when the API is connected),
    // otherwise it becomes a task with the full spec for David.
    const supabase = createServiceRoleClient()
    const { data: approved } = await supabase
      .from('ag_approvals')
      .select('id, title, preview, feedback')
      .eq('agent_key', 'ads')
      .eq('status', 'approved')
      .limit(10)

    for (const approval of approved ?? []) {
      if (approval.feedback?.startsWith('executed')) continue
      await supabase.from('ag_tasks').insert({
        title: `Create paused campaign in Ads Manager: ${approval.title}`,
        rationale: 'Approved ad draft — create PAUSED in Meta Ads Manager, verify targeting and caps, then activate manually.',
        expected_impact: 'Paid growth within the approved caps',
        owner_agent: 'ads',
        status: 'proposed',
      })
      await supabase.from('ag_approvals').update({ feedback: 'executed: task created' }).eq('id', approval.id)
      ctx.log(`task created for approved campaign #${approval.id}`)
    }
  },

  async report(ctx) {
    // Daily monitor: spend vs caps; auto-pause is the ONLY automatic action.
    const supabase = createServiceRoleClient()
    const token = process.env.META_SYSTEM_USER_TOKEN
    const adAccount = process.env.META_AD_ACCOUNT_ID

    if (!token || !adAccount || process.env.AGENTS_DRY_RUN === 'true') {
      ctx.log('ads monitor skipped: not connected or dry run')
      return
    }

    const res = await fetch(
      `${GRAPH}/act_${adAccount}/insights?fields=spend,cpm,ctr,frequency&date_preset=this_month`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) { ctx.log(`Meta insights error ${res.status}`); return }
    const json = await res.json() as { data?: Array<{ spend?: string; frequency?: string }> }
    const spend = parseFloat(json.data?.[0]?.spend ?? '0')
    const monthlyCap = parseFloat(process.env.ADS_MONTHLY_CAP_USD ?? '0')

    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'ads', agent_key: 'ads', metric: 'month_spend_usd', value: spend }
    )

    if (monthlyCap > 0 && spend >= monthlyCap) {
      // Hard cap reached → pause all active campaigns (the one permitted auto-action)
      ctx.log(`MONTHLY CAP REACHED ($${spend} >= $${monthlyCap}) — pausing campaigns`)
      const list = await fetch(
        `${GRAPH}/act_${adAccount}/campaigns?fields=id,status&filtering=[{"field":"status","operator":"EQUAL","value":"ACTIVE"}]`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (list.ok) {
        const { data: campaigns } = await list.json() as { data?: Array<{ id: string }> }
        for (const c of campaigns ?? []) {
          await fetch(`${GRAPH}/${c.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAUSED' }),
          })
        }
        await supabase.from('ag_audit_log').insert({
          agent_key: 'ads', action: 'campaigns_auto_paused',
          detail: { reason: 'monthly cap reached', spend, cap: monthlyCap },
        })
      }
    }
    ctx.log(`kpi: month_spend_usd=${spend}`)
  },
}
