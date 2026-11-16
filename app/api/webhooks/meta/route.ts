// Meta webhook — WhatsApp Cloud API + Instagram + Messenger inbound.
// GET: verification handshake. POST: signature-verified events.
// Inbound message → upsert lead/identity/conversation → open window →
// STOP handling → sales brain → reply queued through the pacing engine.
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isUsNumber } from '@/lib/agents/guards'
import { openWindow } from '@/lib/agents/sales/windows'
import { handleInbound } from '@/lib/agents/sales/brain'
import { recordOptOut } from '@/lib/agents/sales/pacing'
import { emitEvent } from '@/lib/agents/events'

export const dynamic = 'force-dynamic'

// ─── GET: webhook verification ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get('hub.mode')
  const token     = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// ─── POST: events ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const raw = await req.text()

  // Signature check (X-Hub-Signature-256)
  const appSecret = process.env.META_APP_SECRET
  if (appSecret) {
    const signature = req.headers.get('x-hub-signature-256') ?? ''
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return NextResponse.json({ error: 'Bad signature' }, { status: 403 })
    }
  }

  let body: MetaWebhookBody
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }

  try {
    if (body.object === 'whatsapp_business_account') {
      await handleWhatsApp(body)
    } else if (body.object === 'instagram' || body.object === 'page') {
      await handleMessaging(body)
    }
  } catch (err) {
    // Never 500 to Meta (it retries aggressively); log and ack
    const supabase = createServiceRoleClient()
    await supabase.from('ag_audit_log').insert({
      agent_key: 'sales', action: 'webhook_error',
      detail: { error: err instanceof Error ? err.message : String(err) },
    })
  }

  return NextResponse.json({ ok: true })
}

// ─── Types (narrow views of the Meta payloads we use) ────────────────────
interface MetaWebhookBody {
  object: string
  entry?: Array<{
    changes?: Array<{
      field: string
      value: {
        messages?: Array<{
          from: string
          id: string
          type: string
          text?: { body: string }
          referral?: { body?: string; headline?: string; source_url?: string }
        }>
        contacts?: Array<{ profile?: { name?: string }; wa_id: string }>
      }
    }>
    messaging?: Array<{
      sender: { id: string }
      recipient: { id: string }
      message?: { text?: string; mid?: string }
      referral?: { ref?: string }
    }>
  }>
}

// ─── WhatsApp inbound ─────────────────────────────────────────────────────
async function handleWhatsApp(body: MetaWebhookBody) {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue
      const value = change.value
      for (const msg of value.messages ?? []) {
        if (msg.type !== 'text' || !msg.text?.body) continue
        const phone = '+' + msg.from
        const name = value.contacts?.find(c => c.wa_id === msg.from)?.profile?.name ?? null
        // Planner code from click-to-WhatsApp referral or [AP-SKU] in the text
        const plannerCode = msg.referral?.body?.match(/\[AP-([\w-]+)\]/)?.[1]
          ?? msg.text.body.match(/\[AP-([\w-]+)\]/)?.[1] ?? null
        await processInbound('whatsapp', phone, msg.text.body, name, plannerCode, isUsNumber(phone))
      }
    }
  }
}

// ─── Instagram / Messenger inbound ───────────────────────────────────────
async function handleMessaging(body: MetaWebhookBody) {
  const channel = body.object === 'instagram' ? 'instagram' : 'messenger'
  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const text = typeof event.message?.text === 'string' ? event.message.text : null
      if (!text) continue
      const plannerCode = event.referral?.ref?.match(/AP-([\w-]+)/)?.[1]
        ?? text.match(/\[AP-([\w-]+)\]/)?.[1] ?? null
      await processInbound(channel, event.sender.id, text, null, plannerCode, false)
    }
  }
}

// ─── Shared inbound pipeline ──────────────────────────────────────────────
async function processInbound(
  channel: 'whatsapp' | 'instagram' | 'messenger',
  externalId: string,
  text: string,
  name: string | null,
  plannerCode: string | null,
  usNumber: boolean,
) {
  const supabase = createServiceRoleClient()

  // 1. Find or create lead via identity
  const { data: identity } = await supabase
    .from('sa_identities')
    .select('lead_id')
    .eq('channel', channel)
    .eq('external_id', externalId)
    .single()

  let leadId = identity?.lead_id as string | undefined
  if (!leadId) {
    // Resolve planner interest from the [AP-code] (slug or id prefix match)
    let plannerInterest: string | null = null
    if (plannerCode) {
      const { data: p } = await supabase
        .from('products').select('id').or(`slug.eq.${plannerCode},id.eq.${plannerCode}`).limit(1).single()
      plannerInterest = p?.id ?? null
    }
    const market = channel === 'whatsapp' ? (usNumber ? 'us' : externalId.startsWith('+44') ? 'uk' : 'other') : 'other'
    const { data: lead } = await supabase
      .from('sa_leads')
      .insert({
        name, market, source: 'inbound_dm',
        planner_interest: plannerInterest,
        status: 'active',
        tz_offset: market === 'uk' ? 0 : -5,
      })
      .select('id')
      .single()
    if (!lead) return
    leadId = lead.id
    await supabase.from('sa_identities').insert({
      lead_id: leadId, channel, external_id: externalId, is_us_number: usNumber,
    })
    await emitEvent('lead.created', { lead_id: leadId, channel, source: 'inbound_dm' })
  }

  // 2. Inbound message implies a service window
  await openWindow(leadId!, channel, 'service_24h')

  // 3. Find or create conversation
  let { data: convo } = await supabase
    .from('sa_conversations')
    .select('id, human_takeover')
    .eq('lead_id', leadId!)
    .eq('channel', channel)
    .single()
  if (!convo) {
    const { data: created } = await supabase
      .from('sa_conversations')
      .insert({ lead_id: leadId!, channel })
      .select('id, human_takeover')
      .single()
    convo = created
  }
  if (!convo) return

  // 4. Store the inbound message
  await supabase.from('sa_messages').insert({
    conversation_id: convo.id, direction: 'in', body: text, sent_by: 'lead', status: 'received',
  })
  await supabase.from('sa_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', convo.id)

  // 5. STOP handling (honoured even during human takeover)
  if (/^\s*(stop|unsubscribe|opt ?out)\s*$/i.test(text)) {
    await recordOptOut(leadId!, channel)
  }

  // 6. If a human has taken over, the agent stays silent
  if (convo.human_takeover) return

  // 7. Brain → queued reply (pacing engine dispatches it)
  await handleInbound({
    leadId: leadId!, conversationId: convo.id, channel, inboundText: text,
  })
}
