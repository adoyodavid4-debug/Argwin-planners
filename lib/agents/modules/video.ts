// Agent 5 — Short video (masterplan §9). Drafts 3 hook variants + captions
// per planner → Approvals. Rendering (Remotion/ffmpeg) runs outside Vercel;
// approved reels become ready_to_post items with the full brief attached.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { createApproval, getApprovedPending, markExecuted } from '../approvals'
import { listActivePlanners, plannerFacts } from '../catalogue'
import type { AgentModule } from './index'

export const videoModule: AgentModule = {
  key: 'video',

  async plan(ctx) {
    const supabase = createServiceRoleClient()
    const planners = await listActivePlanners(20)

    let target = null
    for (const p of planners) {
      const { count } = await supabase
        .from('ag_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('agent_key', 'video')
        .contains('preview', { planner_id: p.id })
      if ((count ?? 0) === 0) { target = p; break }
    }
    if (!target) { ctx.log('all planners have reel drafts'); return }

    const result = await callLlm({
      agentKey: 'video', runId: ctx.runId,
      systemPrompt: `Write 3 short-video variants (10-30 s, 9:16 vertical) for a digital planner. Output ONLY a JSON array:
[{"hook": "<first-2-seconds on-screen text>", "scene_notes": "<what to show: page flips, tab taps, close-ups>", "caption": "<post caption with 3-5 hashtags>", "end_card": "<planner name + link in bio line>"}]
UK spelling. Royalty-free or own audio only — note "audio: royalty-free upbeat" in scene_notes. Never invent reviews or statistics.`,
      messages: [{ role: 'user', content: plannerFacts(target) }],
      maxTokens: 1000,
    })

    try {
      const variants = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as Array<{
        hook: string; scene_notes: string; caption: string; end_card: string
      }>
      await createApproval({
        agentKey: 'video', actionType: 'publish_reel',
        title: `${variants.length} reel briefs for "${target.title}"`,
        preview: { planner_id: target.id, planner_title: target.title, variants },
      })
      ctx.log(`drafted ${variants.length} reel briefs for ${target.title}`)
    } catch {
      ctx.log('reel draft failed JSON parse — skipped')
    }
  },

  async act(ctx) {
    const supabase = createServiceRoleClient()
    const approved = await getApprovedPending('video', 'publish_reel')

    for (const approval of approved) {
      if ((approval as { feedback?: string | null }).feedback?.startsWith('executed')) continue
      const preview = approval.preview as {
        planner_id?: string; planner_title?: string
        variants?: Array<{ hook: string; scene_notes: string; caption: string; end_card: string }>
      }
      if (!preview.variants?.length) continue

      // Reels become ready_to_post items: render + publish is a manual step
      // until the TikTok audit passes / IG content publishing is connected.
      let created = 0
      for (const v of preview.variants) {
        await supabase.from('ag_scheduled_items').insert({
          agent_key: 'video', channel: 'instagram', item_type: 'reel',
          planner_id: preview.planner_id ?? null,
          title: `Reel: ${v.hook.slice(0, 80)}`,
          payload: v as unknown as Record<string, unknown>,
          scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
          status: 'ready_to_post',
          approval_id: approval.id,
        })
        created++
      }
      await markExecuted(approval.id, 'video', { created })
      await supabase.from('ag_approvals').update({ feedback: `executed: ${created} ready to post` }).eq('id', approval.id)
      ctx.log(`${created} reels marked ready to post from approval #${approval.id}`)
    }
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await supabase
      .from('ag_scheduled_items')
      .select('*', { count: 'exact', head: true })
      .eq('agent_key', 'video')
      .eq('status', 'ready_to_post')
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'video', agent_key: 'video', metric: 'reels_ready', value: count ?? 0 }
    )
    ctx.log(`kpi: reels_ready=${count ?? 0}`)
  },
}
