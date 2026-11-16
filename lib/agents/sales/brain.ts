// Sales agent brain — masterplan §5.4.
// Given an inbound message, produce a reply: ask 1-2 questions, recommend at
// most two planners, one clear call to action. Structured output validated
// with zod (retry once on failure). Handoff triggers route to a human.
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callLlm } from '../llm'
import { searchCatalogue, getPlanner, plannerFacts } from '../catalogue'
import { queueOutbound } from './pacing'

const BrainOutput = z.object({
  reply: z.string().min(1).max(1500),
  intent: z.enum(['question','browsing','ready_to_buy','support','handoff','opt_out']),
  recommended_planner_ids: z.array(z.string()).max(2).default([]),
  wants_checkout_link: z.boolean().default(false),
  handoff_reason: z.string().nullable().default(null),
})
export type BrainResult = z.infer<typeof BrainOutput>

const HANDOFF_KEYWORDS = /refund|complaint|broken|not working|chargeback|bulk order|custom order|speak to (a )?human|real person|talk to someone/i
const STOP_KEYWORDS = /^\s*(stop|unsubscribe|opt ?out)\s*$/i

export async function think(input: {
  leadId: string
  conversationId: string
  channel: 'whatsapp' | 'instagram' | 'messenger'
  inboundText: string
}): Promise<BrainResult> {
  const supabase = createServiceRoleClient()

  // Hard STOP check before any LLM call
  if (STOP_KEYWORDS.test(input.inboundText)) {
    return {
      reply: "You're unsubscribed and won't hear from us again. If you change your mind, just message us any time.",
      intent: 'opt_out', recommended_planner_ids: [], wants_checkout_link: false, handoff_reason: null,
    }
  }

  // Hard handoff triggers before the LLM
  if (HANDOFF_KEYWORDS.test(input.inboundText)) {
    return {
      reply: "I'll pass you to a member of our team — they'll reply here shortly. Thanks for your patience!",
      intent: 'handoff', recommended_planner_ids: [], wants_checkout_link: false,
      handoff_reason: 'keyword trigger: ' + input.inboundText.slice(0, 80),
    }
  }

  // Conversation history (last 10 messages)
  const [{ data: history }, { data: convo }, { data: lead }, { data: settings }, { data: prompt }] = await Promise.all([
    supabase.from('sa_messages')
      .select('direction, body, sent_by')
      .eq('conversation_id', input.conversationId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('sa_conversations').select('failed_answers, disclosure_sent').eq('id', input.conversationId).single(),
    supabase.from('sa_leads').select('planner_interest, name, market').eq('id', input.leadId).single(),
    supabase.from('sa_settings').select('disclosure_text').eq('id', 1).single(),
    supabase.from('ag_prompts').select('content').eq('agent_key', 'sales').order('version', { ascending: false }).limit(1).single(),
  ])

  // Three failed answers in a row → handoff (masterplan §5.4)
  if ((convo?.failed_answers ?? 0) >= 3) {
    return {
      reply: "Let me get a member of our team to help you properly — they'll reply here soon.",
      intent: 'handoff', recommended_planner_ids: [], wants_checkout_link: false,
      handoff_reason: 'three failed answers in a row',
    }
  }

  // Catalogue context: the planner the lead came in on + a keyword search on the message
  const catalogueBlocks: string[] = []
  if (lead?.planner_interest) {
    const p = await getPlanner(lead.planner_interest)
    if (p) catalogueBlocks.push(`## Planner the customer clicked on\n${plannerFacts(p)}\nID: ${p.id}`)
  }
  const searchHits = await searchCatalogue(input.inboundText.slice(0, 60), 4)
  for (const p of searchHits) {
    catalogueBlocks.push(`## Catalogue match\n${plannerFacts(p)}\nID: ${p.id}`)
  }

  const historyText = (history ?? [])
    .reverse()
    .map(m => `${m.direction === 'in' ? 'Customer' : 'Assistant'}: ${m.body}`)
    .join('\n')

  const system = [
    prompt?.content ?? 'You are Arwign\'s sales assistant.',
    convo?.disclosure_sent ? '' :
      `IMPORTANT: this is the first reply in the conversation. Begin with this disclosure, adapted naturally: "${settings?.disclosure_text}"`,
    `## Catalogue facts (the ONLY source of truth for prices, pages, sizes, compatibility)`,
    catalogueBlocks.join('\n\n') || '(no catalogue matches — ask what they are looking for)',
    `## Output format
Respond with ONLY a JSON object, no markdown fences:
{"reply": "<your message to the customer>", "intent": "question|browsing|ready_to_buy|support|handoff|opt_out", "recommended_planner_ids": ["<id>", ...max 2], "wants_checkout_link": true|false, "handoff_reason": null|"<reason>"}
Rules: ask at most two questions before recommending; recommend at most two planners; one clear call to action; UK spelling; never invent prices or features.`,
  ].filter(Boolean).join('\n\n')

  const messages = [
    { role: 'user' as const, content: `Conversation so far:\n${historyText || '(none)'}\n\nNew message from customer: ${input.inboundText}` },
  ]

  // Call + validate, retry once on bad JSON (masterplan §3.3)
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await callLlm({
      agentKey: 'sales',
      systemPrompt: system,
      messages,
      maxTokens: 700,
      temperature: 0.6,
    })

    if (result.content.startsWith('[DRY RUN')) {
      return {
        reply: '[DRY RUN] Thanks for your message! (The sales agent is in dry-run mode — no real reply was generated.)',
        intent: 'browsing', recommended_planner_ids: [], wants_checkout_link: false, handoff_reason: null,
      }
    }

    try {
      const raw = JSON.parse(result.content.replace(/^```json?\s*|\s*```$/g, ''))
      return BrainOutput.parse(raw)
    } catch {
      if (attempt === 1) break
      messages.push(
        { role: 'user' as const, content: 'Your previous output was not valid JSON matching the schema. Reply with ONLY the JSON object.' }
      )
    }
  }

  // Both attempts failed — increment failed_answers and send a safe fallback
  await supabase.from('sa_conversations')
    .update({ failed_answers: (convo?.failed_answers ?? 0) + 1 })
    .eq('id', input.conversationId)

  return {
    reply: "Thanks for your message! Could you tell me a little more about what you're planning to use the planner for?",
    intent: 'question', recommended_planner_ids: [], wants_checkout_link: false, handoff_reason: null,
  }
}

/**
 * Full inbound handler: think → queue the reply → apply side effects
 * (handoff, opt-out, checkout link). Called from the Meta webhook.
 */
export async function handleInbound(input: {
  leadId: string
  conversationId: string
  channel: 'whatsapp' | 'instagram' | 'messenger'
  inboundText: string
}) {
  const supabase = createServiceRoleClient()
  const result = await think(input)

  if (result.intent === 'opt_out') {
    const { recordOptOut } = await import('./pacing')
    await recordOptOut(input.leadId, input.channel)
    // The confirmation reply is still allowed (it is the opt-out acknowledgement)
    await queueOutbound({
      leadId: input.leadId, conversationId: input.conversationId,
      channel: input.channel, kind: 'reply', body: result.reply,
    })
    return result
  }

  if (result.intent === 'handoff') {
    await supabase.from('sa_conversations').update({
      status: 'human', human_takeover: true,
    }).eq('id', input.conversationId)
    await supabase.from('ag_audit_log').insert({
      agent_key: 'sales', action: 'handoff_to_human',
      detail: { conversation_id: input.conversationId, reason: result.handoff_reason },
    })
  }

  let body = result.reply

  // Append checkout link when the customer is ready (tagged with lead for attribution)
  if (result.wants_checkout_link && result.recommended_planner_ids.length > 0) {
    const p = await getPlanner(result.recommended_planner_ids[0])
    if (p) {
      body += `\n\nHere's your checkout link: https://www.arwignplanners.com/products/${p.slug}?utm_source=${input.channel}&utm_medium=sales_agent&lead=${input.leadId}`
    }
  }

  await queueOutbound({
    leadId: input.leadId, conversationId: input.conversationId,
    channel: input.channel, kind: 'reply', body,
  })

  // Mark disclosure as sent after the first reply
  await supabase.from('sa_conversations').update({
    disclosure_sent: true, last_message_at: new Date().toISOString(),
  }).eq('id', input.conversationId)

  return result
}
