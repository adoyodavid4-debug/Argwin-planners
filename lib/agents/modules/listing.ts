// Agent 4 — Marketplace listings (masterplan §8). Drafts Etsy title/13 tags/
// description as an old ↔ new diff → Approvals. Applies via Etsy API when
// connected; Gumroad (no edit API for all fields) becomes a copy-paste task.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { createApproval, getApprovedPending, markExecuted } from '../approvals'
import { listActivePlanners, plannerFacts } from '../catalogue'
import type { AgentModule } from './index'

export const listingModule: AgentModule = {
  key: 'listing',

  async plan(ctx) {
    const supabase = createServiceRoleClient()

    // One listing at a time: pick a tracked listing not optimised recently,
    // or seed from the catalogue when nothing is tracked yet.
    const { data: listing } = await supabase
      .from('ag_listings')
      .select('id, platform, external_id, planner_id, title, tags, description')
      .or(`last_changed_at.is.null,last_changed_at.lt.${new Date(Date.now() - 21 * 86_400_000).toISOString()}`)
      .limit(1)
      .single()

    const planners = await listActivePlanners(10)
    const planner = listing?.planner_id
      ? planners.find(p => p.id === listing.planner_id) ?? planners[0]
      : planners[0]
    if (!planner) { ctx.log('no active planners'); return }

    // Skip when a draft is already pending for this planner
    const { count: pending } = await supabase
      .from('ag_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('agent_key', 'listing')
      .eq('status', 'pending')
      .contains('preview', { planner_id: planner.id })
    if ((pending ?? 0) > 0) { ctx.log('draft already pending'); return }

    const result = await callLlm({
      agentKey: 'listing', runId: ctx.runId,
      systemPrompt: `Optimise an Etsy listing for a digital planner. Output ONLY JSON:
{"title": "<140 chars, front-loaded keywords>", "tags": ["<13 tags, each ≤20 chars>"], "description": "<Etsy description, UK spelling body, 150-300 words>"}
US search phrasing is allowed in tags only. Use ONLY the catalogue facts provided — never invent page counts, prices or compatibility.`,
      messages: [{ role: 'user', content: plannerFacts(planner) }],
      maxTokens: 1000,
    })

    try {
      const draft = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as {
        title: string; tags: string[]; description: string
      }
      await createApproval({
        agentKey: 'listing', actionType: 'update_listing',
        title: `Etsy listing update: ${planner.title}`,
        preview: {
          planner_id: planner.id,
          platform: 'etsy',
          listing_id: listing?.external_id ?? null,
          diff: {
            title:       { old: listing?.title ?? planner.title,            new: draft.title },
            tags:        { old: (listing?.tags ?? planner.tags).join(', '), new: draft.tags.join(', ') },
            description: { old: (listing?.description ?? planner.description ?? '').slice(0, 400), new: draft.description },
          },
        },
      })
      ctx.log(`listing diff drafted for ${planner.title}`)
    } catch {
      ctx.log('listing draft failed JSON parse — skipped')
    }
  },

  async act(ctx) {
    const supabase = createServiceRoleClient()
    const approved = await getApprovedPending('listing', 'update_listing')

    for (const approval of approved) {
      if ((approval as { feedback?: string | null }).feedback?.startsWith('executed')) continue
      const preview = approval.preview as {
        planner_id?: string; platform?: string; listing_id?: string | null
        diff?: Record<string, { old: string; new: string }>
      }
      if (!preview.diff) continue

      const etsyToken = process.env.ETSY_REFRESH_TOKEN
      const shopId    = process.env.ETSY_SHOP_ID

      if (preview.platform === 'etsy' && etsyToken && shopId && preview.listing_id && process.env.AGENTS_DRY_RUN !== 'true') {
        // Live path: Etsy Open API v3 updateListing
        const res = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${preview.listing_id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${etsyToken}`,
              'x-api-key': process.env.ETSY_KEYSTRING ?? '',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              title: preview.diff.title?.new ?? '',
              tags: preview.diff.tags?.new ?? '',
              description: preview.diff.description?.new ?? '',
            }),
          }
        )
        if (res.ok) {
          await supabase.from('ag_listings').update({
            title: preview.diff.title?.new,
            tags: (preview.diff.tags?.new ?? '').split(',').map(t => t.trim()),
            description: preview.diff.description?.new,
            last_changed_at: new Date().toISOString(),
            eval_until: new Date(Date.now() + 21 * 86_400_000).toISOString(),
          }).eq('platform', 'etsy').eq('external_id', preview.listing_id)
          ctx.log(`applied listing update #${approval.id} via Etsy API`)
        } else {
          ctx.log(`Etsy API error ${res.status} on approval #${approval.id}`)
          continue
        }
      } else {
        // Not connected (or dry run): copy-paste task for David
        await supabase.from('ag_tasks').insert({
          title: `Apply listing copy: ${approval.title}`,
          rationale: 'Marketplace not connected (or dry-run) — copy ready to paste.',
          expected_impact: 'Improved search rank and conversion',
          owner_agent: 'listing',
          status: 'proposed',
        })
        ctx.log(`created copy-paste task for approval #${approval.id}`)
      }

      await markExecuted(approval.id, 'listing')
      await supabase.from('ag_approvals').update({ feedback: 'executed' }).eq('id', approval.id)
    }
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await supabase
      .from('ag_listings').select('*', { count: 'exact', head: true })
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'marketplace', agent_key: 'listing', metric: 'tracked_listings', value: count ?? 0 }
    )
    ctx.log(`kpi: tracked_listings=${count ?? 0}`)
  },
}
