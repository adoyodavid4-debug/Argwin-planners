// Agent 3 — Pinterest (masterplan §7). Drafts keyword-rich pin copy per
// planner → Approvals; approved pins are scheduled across US/UK active hours
// in ag_scheduled_items; the tick route publishes due pins (API v5 when
// connected, otherwise they sit as ready_to_post).
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { createApproval, getApprovedPending, markExecuted } from '../approvals'
import { listActivePlanners, plannerFacts } from '../catalogue'
import type { AgentModule } from './index'

const PINS_PER_PLANNER = 5
const PINS_PER_DAY = 5
// Hours (UTC) when US/UK users are active: 13-21 UTC ≈ 8-16 ET / 13-21 UK
const ACTIVE_HOURS_UTC = [13, 15, 17, 19, 21]

export const pinterestModule: AgentModule = {
  key: 'pinterest',

  async plan(ctx) {
    const supabase = createServiceRoleClient()

    // Find one planner with no pin drafts yet (one planner first — scope rule)
    const planners = await listActivePlanners(50)
    let target = null
    for (const p of planners) {
      const { count } = await supabase
        .from('ag_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('agent_key', 'pinterest')
        .contains('preview', { planner_id: p.id })
      if ((count ?? 0) === 0) { target = p; break }
    }
    if (!target) { ctx.log('all planners have pin drafts — nothing to plan'); return }

    const result = await callLlm({
      agentKey: 'pinterest', runId: ctx.runId,
      systemPrompt: `Create ${PINS_PER_PLANNER} Pinterest pin variants for a digital planner. Output ONLY a JSON array:
[{"variant": "cover|interior|whats_inside|who_its_for|benefit", "title": "<max 100 chars, keyword-rich>", "description": "<max 480 chars with a call to action>", "alt_text": "<describe the image>"}]
UK spelling in body copy; US search terms allowed in keywords. Never invent reviews or statistics.`,
      messages: [{ role: 'user', content: plannerFacts(target) }],
      maxTokens: 1400,
    })

    try {
      const pins = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as Array<{
        variant: string; title: string; description: string; alt_text: string
      }>
      const link = `https://www.arwignplanners.com/products/${target.slug}?utm_source=pinterest&utm_medium=pin&utm_campaign=agent`
      await createApproval({
        agentKey: 'pinterest', actionType: 'publish_pin',
        title: `${pins.length} pins for "${target.title}"`,
        preview: {
          planner_id: target.id,
          planner_title: target.title,
          link,
          image_source: target.thumbnail ?? target.images[0] ?? null,
          pins,
        },
      })
      ctx.log(`drafted ${pins.length} pins for ${target.title}`)
    } catch {
      ctx.log('pin draft failed JSON parse — skipped')
    }
  },

  async act(ctx) {
    const supabase = createServiceRoleClient()
    const approved = await getApprovedPending('pinterest', 'publish_pin')

    for (const approval of approved) {
      const preview = approval.preview as {
        planner_id?: string; planner_title?: string; link?: string
        image_source?: string | null
        pins?: Array<{ variant: string; title: string; description: string; alt_text: string }>
      }
      if (!preview.pins?.length) continue

      // Already scheduled? (feedback stamp prevents re-execution)
      if ((approval as { feedback?: string | null }).feedback?.startsWith('executed')) continue

      // Spread pins across the coming days at active hours, max PINS_PER_DAY
      let scheduled = 0
      const now = new Date()
      for (let i = 0; i < preview.pins.length; i++) {
        const pin = preview.pins[i]
        const dayOffset  = Math.floor(i / PINS_PER_DAY) + 1
        const hour = ACTIVE_HOURS_UTC[i % ACTIVE_HOURS_UTC.length]
        const when = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hour, 0, 0))
        await supabase.from('ag_scheduled_items').insert({
          agent_key: 'pinterest', channel: 'pinterest', item_type: 'pin',
          planner_id: preview.planner_id ?? null,
          title: pin.title,
          payload: { ...pin, link: preview.link, image_source: preview.image_source },
          scheduled_at: when.toISOString(),
          approval_id: approval.id,
        })
        scheduled++
      }
      await markExecuted(approval.id, 'pinterest', { scheduled })
      await supabase.from('ag_approvals').update({ feedback: `executed: scheduled ${scheduled}` }).eq('id', approval.id)
      ctx.log(`scheduled ${scheduled} pins from approval #${approval.id}`)
    }
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const { count: published } = await supabase
      .from('ag_scheduled_items')
      .select('*', { count: 'exact', head: true })
      .eq('agent_key', 'pinterest')
      .eq('status', 'published')
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'pinterest', agent_key: 'pinterest', metric: 'pins_published_total', value: published ?? 0 }
    )
    ctx.log(`kpi: pins_published_total=${published ?? 0}`)
  },
}

/** Publish one due pin via Pinterest API v5. Returns ready_to_post when not connected. */
export async function publishPin(item: {
  id: number
  title: string
  payload: { description?: string; alt_text?: string; link?: string; image_source?: string | null }
}): Promise<{ status: 'published' | 'ready_to_post' | 'failed'; error?: string }> {
  const token = process.env.PINTEREST_REFRESH_TOKEN  // exchange handled by a token refresher in production
  const boardId = process.env.PINTEREST_DEFAULT_BOARD_ID

  if (process.env.AGENTS_DRY_RUN === 'true') return { status: 'published' }  // dry-run pretends
  if (!token || !boardId) return { status: 'ready_to_post' }
  if (!item.payload.image_source) return { status: 'ready_to_post' }

  const res = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board_id: boardId,
      title: item.title,
      description: item.payload.description,
      alt_text: item.payload.alt_text,
      link: item.payload.link,
      media_source: { source_type: 'image_url', url: item.payload.image_source },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    return { status: 'failed', error: `Pinterest ${res.status}: ${err.slice(0, 200)}` }
  }
  return { status: 'published' }
}
