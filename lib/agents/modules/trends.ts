// Agent 10 — Trend research (masterplan §14). Research only: publishes
// nothing, contacts no one. Emits seasonal alerts ahead of lead time and
// writes a monthly Opportunities brief as ag_tasks.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { emitEvent } from '../events'
import { listActivePlanners } from '../catalogue'
import type { AgentModule } from './index'

export const trendsModule: AgentModule = {
  key: 'trends',

  async plan(ctx) {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const month = now.getUTCMonth() + 1

    // ── Seasonal alerts: entries whose window starts within lead time ─────
    const { data: seasons } = await supabase.from('ag_calendar').select('*')
    let alerts = 0
    for (const s of seasons ?? []) {
      // Months until the season starts (wrapping the year)
      const monthsUntil = (s.start_month - month + 12) % 12
      const daysUntil = monthsUntil * 30
      if (daysUntil > 0 && daysUntil <= s.lead_time_days) {
        // One alert per season per year
        const { count } = await supabase
          .from('ag_events')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'seasonal.alert')
          .contains('payload', { name: s.name, year: now.getUTCFullYear() })
        if ((count ?? 0) === 0) {
          await emitEvent('seasonal.alert', {
            name: s.name, market: s.market, year: now.getUTCFullYear(),
            start_month: s.start_month, notes: s.notes,
          })
          alerts++
        }
      }
    }
    ctx.log(`seasonal alerts emitted: ${alerts}`)

    // ── Monthly Opportunities brief (first run of each calendar month) ─────
    const monthKey = `${now.getUTCFullYear()}-${String(month).padStart(2, '0')}`
    const { count: existing } = await supabase
      .from('ag_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('owner_agent', 'trends')
      .ilike('title', `Opportunities brief ${monthKey}%`)
    if ((existing ?? 0) > 0) { ctx.log('this month\'s brief already exists'); return }

    const planners = await listActivePlanners(30)
    const existingTitles = planners.map(p => p.title).join('; ')
    const upcomingSeasons = (seasons ?? [])
      .filter(s => ((s.start_month - month + 12) % 12) <= 3)
      .map(s => `${s.name} (${s.market})`)
      .join('; ')

    const result = await callLlm({
      agentKey: 'trends', runId: ctx.runId,
      systemPrompt: `You research demand for digital planners (iPad, GoodNotes/Notability) in the US, UK and Asia. Output ONLY JSON:
{"ideas": [{"title": "<new planner title idea>", "evidence": "<why demand exists>", "market": "us|uk|asia|all", "collection": "<suggested collection>", "motif_direction": "<a distinct cover motif, different from every existing planner>"}], "keywords": ["<10-15 keywords for Pinterest/Etsy/SEO>"]}
3-5 ideas, ranked. Never suggest a motif already in the existing catalogue.`,
      messages: [{
        role: 'user',
        content: `Existing planner titles (do not duplicate their motifs): ${existingTitles}\n\nUpcoming seasons: ${upcomingSeasons || 'none in the next 3 months'}`,
      }],
      maxTokens: 1200,
    })

    try {
      const brief = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as {
        ideas: Array<{ title: string; evidence: string; market: string; collection: string; motif_direction: string }>
        keywords: string[]
      }
      await supabase.from('ag_tasks').insert({
        title: `Opportunities brief ${monthKey}`,
        rationale: brief.ideas
          .map((i, n) => `${n + 1}. "${i.title}" [${i.market}/${i.collection}] — ${i.evidence}. Motif: ${i.motif_direction}`)
          .join('\n'),
        expected_impact: `Keyword list for agents 3/4/7: ${brief.keywords.join(', ')}`,
        owner_agent: 'trends',
        status: 'proposed',
      })
      ctx.log(`opportunities brief ${monthKey} created with ${brief.ideas.length} ideas`)
    } catch {
      ctx.log('brief failed JSON parse — skipped')
    }
  },

  async act(_ctx) {
    // Research only — publishes nothing, contacts no one (masterplan rule).
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await supabase
      .from('ag_tasks').select('*', { count: 'exact', head: true }).eq('owner_agent', 'trends')
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'research', agent_key: 'trends', metric: 'briefs_total', value: count ?? 0 }
    )
    ctx.log(`kpi: briefs_total=${count ?? 0}`)
  },
}
