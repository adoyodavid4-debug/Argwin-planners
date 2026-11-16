// Agent 7 — SEO blog (masterplan §11). Writes 1,200-2,000-word UK-spelling
// articles with contextual planner links → Approvals; on approval the article
// is published into the existing blog_posts table.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { createApproval, getApprovedPending, markExecuted } from '../approvals'
import { listActivePlanners, plannerFacts } from '../catalogue'
import type { AgentModule } from './index'

const TOPIC_SEEDS = [
  'best digital budget planner for iPad',
  'how to use a digital planner in GoodNotes',
  'ADHD planner that actually works',
  'digital planner vs paper planner',
  'how to import a PDF planner into Notability',
  'digital planning for beginners',
]

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80)
}

export const seoModule: AgentModule = {
  key: 'seo',

  async plan(ctx) {
    const supabase = createServiceRoleClient()

    // One article at a time
    const { count: open } = await supabase
      .from('ag_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('agent_key', 'seo')
      .eq('status', 'pending')
    if ((open ?? 0) > 0) { ctx.log('article draft already pending'); return }

    // Pick a topic not yet covered on the blog
    const { data: existing } = await supabase.from('blog_posts').select('title').limit(200)
    const covered = new Set((existing ?? []).map(p => p.title.toLowerCase()))
    const topic = TOPIC_SEEDS.find(t => !Array.from(covered).some(c => c.includes(t.split(' ').slice(0, 3).join(' '))))
    if (!topic) { ctx.log('all seed topics covered — waiting for trend agent keywords'); return }

    const planners = await listActivePlanners(4)
    const catalogueBlock = planners.map(p => plannerFacts(p)).join('\n\n')

    const result = await callLlm({
      agentKey: 'seo', runId: ctx.runId,
      systemPrompt: `Write an SEO article for arwignplanners.com. Output ONLY JSON:
{"title": "<60 chars max>", "meta_title": "<60 chars>", "meta_description": "<155 chars>", "excerpt": "<160 chars>", "body_html": "<the full article as clean HTML: h2/h3/p/ul, 1200-2000 words>", "faq": [{"q": "...", "a": "..."}]}
Rules: UK spelling; genuinely useful practical content, not padding; 2-4 contextual links to the planners provided (use their URLs); no invented statistics or expert quotes; make clear recommendations are Arwign products; author is "Arwign Planners team".`,
      messages: [{ role: 'user', content: `Topic: ${topic}\n\nPlanners to link to:\n${catalogueBlock}` }],
      maxTokens: 4000,
    })

    try {
      const article = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, '')) as {
        title: string; meta_title: string; meta_description: string
        excerpt: string; body_html: string; faq: Array<{ q: string; a: string }>
      }
      await createApproval({
        agentKey: 'seo', actionType: 'publish_article',
        title: `Article: ${article.title}`,
        preview: { topic, ...article },
      })
      ctx.log(`article drafted: ${article.title}`)
    } catch {
      ctx.log('article draft failed JSON parse — skipped')
    }
  },

  async act(ctx) {
    const supabase = createServiceRoleClient()
    const approved = await getApprovedPending('seo', 'publish_article')

    for (const approval of approved) {
      if ((approval as { feedback?: string | null }).feedback?.startsWith('executed')) continue
      const a = approval.preview as {
        title?: string; meta_title?: string; meta_description?: string
        excerpt?: string; body_html?: string; faq?: Array<{ q: string; a: string }>
      }
      if (!a.title || !a.body_html) continue

      // Append FAQ section (FAQ schema is rendered by the blog template from content)
      let body = a.body_html
      if (a.faq?.length) {
        body += '\n<h2>Frequently asked questions</h2>\n'
          + a.faq.map(f => `<h3>${f.q}</h3>\n<p>${f.a}</p>`).join('\n')
      }

      const { error } = await supabase.from('blog_posts').insert({
        title: a.title,
        slug: slugify(a.title),
        excerpt: a.excerpt ?? null,
        body,
        status: 'published',
        tags: ['digital planning'],
        category: 'Guides',
        meta_title: a.meta_title ?? a.title,
        meta_description: a.meta_description ?? null,
        read_time_mins: Math.max(5, Math.round((body.split(/\s+/).length) / 220)),
        published_at: new Date().toISOString(),
      })

      if (error) { ctx.log(`publish failed: ${error.message}`); continue }
      await markExecuted(approval.id, 'seo')
      await supabase.from('ag_approvals').update({ feedback: 'executed: published' }).eq('id', approval.id)
      ctx.log(`published article "${a.title}"`)
    }
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await supabase
      .from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published')
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'blog', agent_key: 'seo', metric: 'published_articles', value: count ?? 0 }
    )
    ctx.log(`kpi: published_articles=${count ?? 0}`)
  },
}
