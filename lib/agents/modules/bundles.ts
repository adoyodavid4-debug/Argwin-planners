// Agent 9 — Bundles & pricing (masterplan §13). Analyses co-purchases,
// proposes bundles + price tests → Approvals (always — pricing is spending-
// adjacent). Never fake "was" prices; bundle covers need a NEW motif.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { createApproval } from '../approvals'
import { listActivePlanners } from '../catalogue'
import type { AgentModule } from './index'

export const bundlesModule: AgentModule = {
  key: 'bundles',

  async plan(ctx) {
    const supabase = createServiceRoleClient()

    // At most 2 open proposals at a time
    const { count: open } = await supabase
      .from('ag_bundle_proposals')
      .select('*', { count: 'exact', head: true })
      .in('status', ['proposed'])
    if ((open ?? 0) >= 2) { ctx.log('2 proposals already open'); return }

    // Co-purchase analysis: emails with more than one completed order
    const { data: orders } = await supabase
      .from('orders')
      .select('email, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(500)

    const buyers = new Map<string, number>()
    for (const o of orders ?? []) {
      if (!o.email) continue
      buyers.set(o.email, (buyers.get(o.email) ?? 0) + 1)
    }
    const repeatRate = buyers.size > 0
      ? Array.from(buyers.values()).filter(n => n > 1).length / buyers.size
      : 0

    const planners = await listActivePlanners(12)
    if (planners.length < 3) { ctx.log('fewer than 3 planners — no bundle to propose'); return }

    const catalogueList = planners
      .map(p => `- ${p.title} (${p.currency} ${p.price}, id: ${p.id}${p.is_bundle ? ', ALREADY A BUNDLE' : ''})`)
      .join('\n')

    const result = await callLlm({
      agentKey: 'bundles', runId: ctx.runId,
      systemPrompt: `Propose ONE planner bundle. Output ONLY JSON:
{"name": "<bundle name>", "planner_ids": ["<2-4 ids, never ones marked ALREADY A BUNDLE>"], "suggested_price_usd": <number, 15-30% below the sum of individual prices>, "rationale": "<why these go together>", "cover_brief": "<a NEW cover motif direction — never reuse any single planner's motif>"}
Honesty rules: no fake "was" prices, no invented urgency.`,
      messages: [{ role: 'user', content: `Catalogue:\n${catalogueList}\n\nRepeat-buyer rate: ${(repeatRate * 100).toFixed(1)}%` }],
      maxTokens: 600,
    })

    try {
      const proposal = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as {
        name: string; planner_ids: string[]; suggested_price_usd: number
        rationale: string; cover_brief: string
      }
      const validIds = proposal.planner_ids.filter(id => planners.some(p => p.id === id && !p.is_bundle))
      if (validIds.length < 2) { ctx.log('proposal had invalid planner ids — skipped'); return }

      const { data: row } = await supabase.from('ag_bundle_proposals').insert({
        name: proposal.name,
        planner_ids: validIds,
        suggested_price: proposal.suggested_price_usd,
        rationale: proposal.rationale,
        cover_brief: proposal.cover_brief,
      }).select('id').single()

      const approval = await createApproval({
        agentKey: 'bundles', actionType: 'create_bundle',
        title: `Bundle: ${proposal.name} ($${proposal.suggested_price_usd})`,
        preview: { ...proposal, planner_ids: validIds, proposal_id: row?.id },
      })
      if (row) {
        await supabase.from('ag_bundle_proposals').update({ approval_id: approval.id }).eq('id', row.id)
      }
      ctx.log(`bundle proposed: ${proposal.name}`)
    } catch {
      ctx.log('bundle proposal failed JSON parse — skipped')
    }
  },

  async act(ctx) {
    // Approved bundles become build tasks for David (product creation is manual:
    // new cover motif, new PDF assembly). The agent never changes prices itself.
    const supabase = createServiceRoleClient()
    const { data: approved } = await supabase
      .from('ag_bundle_proposals')
      .select('id, name, cover_brief, approval_id')
      .eq('status', 'proposed')
      .not('approval_id', 'is', null)

    for (const proposal of approved ?? []) {
      const { data: approvalRow } = await supabase
        .from('ag_approvals').select('status').eq('id', proposal.approval_id!).single()
      if (approvalRow?.status === 'approved') {
        await supabase.from('ag_bundle_proposals').update({ status: 'approved' }).eq('id', proposal.id)
        await supabase.from('ag_tasks').insert({
          title: `Build bundle: ${proposal.name}`,
          rationale: `Approved bundle proposal. Cover brief: ${proposal.cover_brief}`,
          expected_impact: 'Higher average order value',
          owner_agent: 'bundles',
          status: 'proposed',
        })
        ctx.log(`build task created for bundle ${proposal.name}`)
      } else if (approvalRow?.status === 'rejected') {
        await supabase.from('ag_bundle_proposals').update({ status: 'rejected' }).eq('id', proposal.id)
      }
    }
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const { data: orders } = await supabase
      .from('orders')
      .select('amount_total')
      .eq('status', 'completed')
      .gte('created_at', monthAgo)
    const totals = (orders ?? []).map(o => o.amount_total as number)
    const aov = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'site', agent_key: 'bundles', metric: 'aov_30d', value: Math.round(aov * 100) / 100 }
    )
    ctx.log(`kpi: aov_30d=${aov.toFixed(2)}`)
  },
}
