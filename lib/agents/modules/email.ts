// Agent 2 — Email (masterplan §6). Flows run automatically once approved;
// campaigns always go to Approvals. Max 2 marketing emails per contact per
// week, suppression checked at send time by sendAgentEmail.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { createApproval, getApprovedPending, markExecuted } from '../approvals'
import { sendAgentEmail } from '../email-send'
import { getPlanner } from '../catalogue'
import type { AgentModule } from './index'

const MAX_EMAILS_PER_WEEK = 2

async function underWeeklyCap(email: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { count } = await supabase
    .from('ag_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'marketing_email_sent')
    .gte('created_at', weekAgo)
    .contains('detail', { to: email })
  return (count ?? 0) < MAX_EMAILS_PER_WEEK
}

async function logSent(to: string, flow: string) {
  const supabase = createServiceRoleClient()
  await supabase.from('ag_audit_log').insert({
    agent_key: 'email', action: 'marketing_email_sent', detail: { to, flow },
  })
}

async function alreadySent(to: string, flow: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { count } = await supabase
    .from('ag_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'marketing_email_sent')
    .contains('detail', { to, flow })
  return (count ?? 0) > 0
}

export const emailModule: AgentModule = {
  key: 'email',

  async plan(ctx) {
    const supabase = createServiceRoleClient()

    // ── Post-purchase flow: day-0 download help, day-21 cross-sell ─────────
    const now = Date.now()
    const { data: orders } = await supabase
      .from('orders')
      .select('id, email, created_at')
      .eq('status', 'completed')
      .gte('created_at', new Date(now - 30 * 86_400_000).toISOString())
      .limit(200)

    let flowQueued = 0
    for (const order of orders ?? []) {
      if (!order.email) continue
      const ageDays = (now - new Date(order.created_at).getTime()) / 86_400_000

      // Day 0 (within 24 h): download & import help — transactional
      if (ageDays < 1 && !(await alreadySent(order.email, `pp_day0_${order.id}`))) {
        const r = await sendAgentEmail({
          to: order.email,
          subject: 'Your planner — download & import guide',
          bodyHtml: `<p>Thank you for your order! Your planner is ready to download from your order confirmation.</p>
            <p><strong>Importing into GoodNotes:</strong> open the download link in Safari on your iPad, tap Share, then "Open in GoodNotes" and choose "Import as New Document".</p>
            <p><strong>Importing into Notability:</strong> open the link in Safari, tap Share, then "Open in Notability".</p>
            <p>Tip: hyperlinked tabs work when the app is in read (not editing) mode.</p>
            <p>Stuck? Just reply to this email and we'll help.</p>`,
          kind: 'transactional',
          idempotencyKey: `pp_day0_${order.id}`,
        })
        if (r.ok) { await logSent(order.email, `pp_day0_${order.id}`); flowQueued++ }
      }

      // Day 21: related-planner cross-sell — marketing (consent checked in sender)
      if (ageDays >= 21 && ageDays < 22 && !(await alreadySent(order.email, `pp_day21_${order.id}`))) {
        if (await underWeeklyCap(order.email)) {
          const r = await sendAgentEmail({
            to: order.email,
            subject: 'Three weeks in — how is your planner working for you?',
            bodyHtml: `<p>You've had your planner for three weeks now — we hope it's earning its place on your iPad.</p>
              <p>If you'd like to expand your setup, browse the full collection at
              <a href="https://www.arwignplanners.com/products?utm_source=email&utm_medium=flow&utm_campaign=pp_day21" style="color:#C9A84C">arwignplanners.com</a>.</p>`,
            kind: 'marketing',
            idempotencyKey: `pp_day21_${order.id}`,
          })
          if (r.ok && r.reason !== 'no confirmed marketing consent') {
            await logSent(order.email, `pp_day21_${order.id}`); flowQueued++
          }
        }
      }
    }
    ctx.log(`flows: ${flowQueued} flow emails processed`)

    // ── Welcome flow for newly confirmed subscribers ───────────────────────
    const { data: newContacts } = await supabase
      .from('contacts_consent')
      .select('email, collection, granted_at')
      .eq('status', 'confirmed')
      .gte('granted_at', new Date(now - 2 * 86_400_000).toISOString())
      .limit(100)

    let welcomed = 0
    for (const c of newContacts ?? []) {
      if (await alreadySent(c.email, 'welcome_1')) continue
      const r = await sendAgentEmail({
        to: c.email,
        subject: 'Welcome — your free sample pages are here',
        bodyHtml: `<p>Welcome to Arwign Planners! Your free sample pages are attached to your confirmation email.</p>
          <p><strong>Getting started:</strong> import the sample into GoodNotes or Notability (open in Safari → Share → Open in the app) and try the hyperlinked tabs — tap once in read mode to jump between sections.</p>
          <p>Over the next few days we'll send you a short guide to choosing the right planner${c.collection ? ` from the ${c.collection} collection` : ''}.</p>`,
        kind: 'marketing',
        idempotencyKey: `welcome_1_${c.email}`,
      })
      if (r.ok && r.reason !== 'no confirmed marketing consent') {
        await logSent(c.email, 'welcome_1'); welcomed++
      }
    }
    ctx.log(`welcome: ${welcomed} new subscribers welcomed`)

    // ── Seasonal campaign drafts (from calendar alerts) → Approvals ───────
    const { data: pendingDraft } = await supabase
      .from('ag_approvals')
      .select('id')
      .eq('agent_key', 'email')
      .eq('action_type', 'send_campaign')
      .in('status', ['pending', 'approved'])
      .limit(1)

    if (!pendingDraft || pendingDraft.length === 0) {
      const { data: seasonal } = await supabase
        .from('ag_events')
        .select('id, payload')
        .eq('type', 'seasonal.alert')
        .is('processed_at', null)
        .limit(1)

      if (seasonal && seasonal.length > 0) {
        const season = seasonal[0].payload as { name?: string; market?: string }
        const draft = await callLlm({
          agentKey: 'email', runId: ctx.runId,
          systemPrompt: 'Write a seasonal marketing email for Arwign digital planners. Output ONLY JSON: {"subject": "...", "preview_text": "...", "body_html": "<p>...</p>"} — UK spelling, warm, no invented discounts or scarcity.',
          messages: [{ role: 'user', content: `Season: ${season.name ?? 'seasonal push'}. Market: ${season.market ?? 'all'}. Link to https://www.arwignplanners.com/products with UTM utm_source=email&utm_medium=campaign.` }],
          maxTokens: 900,
        })
        try {
          const parsed = JSON.parse(draft.content.replace(/^```json?\s*|\s*```$/g, '')) as { subject: string; preview_text: string; body_html: string }
          const { count: audience } = await supabase
            .from('contacts_consent')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'confirmed')
          await createApproval({
            agentKey: 'email', actionType: 'send_campaign',
            title: `Campaign: ${parsed.subject}`,
            preview: { subject: parsed.subject, preview_text: parsed.preview_text, body_html: parsed.body_html, segment: season.market ?? 'all', recipient_count: audience ?? 0 },
          })
          await supabase.from('ag_events')
            .update({ processed_at: new Date().toISOString() })
            .eq('id', seasonal[0].id)
          ctx.log(`campaign drafted for ${season.name}`)
        } catch { ctx.log('campaign draft failed JSON parse — skipped') }
      }
    }
  },

  async act(ctx) {
    // Send approved campaigns to confirmed contacts (weekly cap per contact)
    const supabase = createServiceRoleClient()
    const approved = await getApprovedPending('email', 'send_campaign')

    for (const approval of approved) {
      const preview = approval.preview as { subject?: string; body_html?: string; segment?: string }
      if (!preview.subject || !preview.body_html) continue

      let q = supabase.from('contacts_consent').select('email').eq('status', 'confirmed')
      if (preview.segment && preview.segment !== 'all') q = q.eq('market', preview.segment)
      const { data: recipients } = await q.limit(2000)

      let sent = 0
      for (const r of recipients ?? []) {
        if (!(await underWeeklyCap(r.email))) continue
        if (await alreadySent(r.email, `campaign_${approval.id}`)) continue
        const res = await sendAgentEmail({
          to: r.email, subject: preview.subject, bodyHtml: preview.body_html,
          kind: 'marketing', idempotencyKey: `campaign_${approval.id}_${r.email}`,
        })
        if (res.ok && res.reason !== 'no confirmed marketing consent') {
          await logSent(r.email, `campaign_${approval.id}`); sent++
        }
      }
      await markExecuted(approval.id, 'email', { sent })
      // Prevent re-execution: mark edited→approved flow by flipping status to 'edited' is wrong;
      // instead stamp feedback so getApprovedPending skips it next run
      await supabase.from('ag_approvals').update({ feedback: `executed: sent ${sent}` }).eq('id', approval.id)
      ctx.log(`campaign #${approval.id}: sent ${sent}`)
    }
  },

  async report(ctx) {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)
    const { count: listSize } = await supabase
      .from('contacts_consent').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')
    // Insert is idempotent-ish: the unique index rejects duplicates for the day; error is ignored
    await supabase.from('ag_kpi_snapshots').insert(
      { date: today, channel: 'email', agent_key: 'email', metric: 'list_size', value: listSize ?? 0 }
    )
    ctx.log(`kpi: list_size=${listSize ?? 0}`)
  },
}
