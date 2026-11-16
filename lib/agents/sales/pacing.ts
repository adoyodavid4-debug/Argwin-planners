// Pacing engine — masterplan §5.3. All outbound messages flow through
// sa_outbound_queue; dispatch is called once per tick (per minute) and sends
// AT MOST pace_per_minute per channel. Consent, suppression, window and quiet
// hours are re-checked at send time, not just at queue time.
import { createServiceRoleClient } from '@/lib/supabase/server'
import { canContact, isUsNumber } from '../guards'
import { isWindowOpen } from './windows'
import { sendWhatsAppText, sendWhatsAppTemplate, sendMetaDm, type SendResult } from './send'

const CHANNELS = ['whatsapp', 'instagram', 'messenger'] as const

export interface DispatchReport {
  sent: number
  cancelled: number
  failed: number
  details: string[]
}

/** Queue a message. `kind: 'reply'` goes out next tick; follow-ups respect caps. */
export async function queueOutbound(input: {
  leadId: string
  conversationId?: string
  channel: 'whatsapp' | 'instagram' | 'messenger'
  kind: 'reply' | 'followup' | 'template'
  body: string
  templateKey?: string
  notBefore?: Date
}) {
  const supabase = createServiceRoleClient()

  if (input.kind === 'followup') {
    const settings = await getSettings()
    // Per-lead weekly proactive cap
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { count } = await supabase
      .from('sa_outbound_queue')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', input.leadId)
      .eq('kind', 'followup')
      .eq('status', 'sent')
      .gte('sent_at', weekAgo)
    if ((count ?? 0) >= settings.max_proactive_per_week) {
      return { queued: false, reason: 'weekly proactive cap reached' }
    }
  }

  await supabase.from('sa_outbound_queue').insert({
    lead_id:         input.leadId,
    conversation_id: input.conversationId ?? null,
    channel:         input.channel,
    kind:            input.kind,
    body:            input.body,
    template_key:    input.templateKey ?? null,
    not_before:      (input.notBefore ?? new Date()).toISOString(),
  })
  return { queued: true }
}

async function getSettings() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('sa_settings').select('*').eq('id', 1).single()
  return data ?? {
    pace_per_minute: 1, max_proactive_per_week: 2, max_sequence_steps: 3,
    quiet_start_hour: 21, quiet_end_hour: 9, min_seconds_between: 60,
  }
}

/**
 * Dispatch due messages: at most `pace_per_minute` per channel per call.
 * Live replies take priority over follow-ups (ordered by kind then age).
 */
export async function dispatchDueOutbound(): Promise<DispatchReport> {
  const supabase = createServiceRoleClient()
  const settings = await getSettings()
  const report: DispatchReport = { sent: 0, cancelled: 0, failed: 0, details: [] }

  // Global kill switch + sales agent switch
  const [{ data: global }, { data: agent }] = await Promise.all([
    supabase.from('ag_global_config').select('all_agents_paused').eq('id', 1).single(),
    supabase.from('ag_agents').select('enabled').eq('key', 'sales').single(),
  ])
  if (global?.all_agents_paused || !agent?.enabled) {
    report.details.push('sales dispatch skipped: kill switch / agent disabled')
    return report
  }

  for (const channel of CHANNELS) {
    // Replies first, then follow-ups; oldest first
    const { data: due } = await supabase
      .from('sa_outbound_queue')
      .select('id, lead_id, conversation_id, kind, body, template_key')
      .eq('status', 'queued')
      .eq('channel', channel)
      .lte('not_before', new Date().toISOString())
      .order('kind', { ascending: false })   // 'reply' > 'followup' alphabetically? no — use two queries
      .order('created_at', { ascending: true })
      .limit(settings.pace_per_minute * 3)   // headroom; we stop at the pace below

    if (!due || due.length === 0) continue

    // replies before followups before templates
    const prioritised = [...due].sort((a, b) => {
      const rank = (k: string) => (k === 'reply' ? 0 : k === 'followup' ? 1 : 2)
      return rank(a.kind) - rank(b.kind)
    })

    let sentThisChannel = 0
    for (const msg of prioritised) {
      if (sentThisChannel >= settings.pace_per_minute) break

      const verdict = await checkSendable(msg.lead_id, channel, msg.kind)
      if (!verdict.allowed) {
        await supabase.from('sa_outbound_queue').update({
          status: 'cancelled', cancel_reason: verdict.reason,
        }).eq('id', msg.id)
        report.cancelled++
        report.details.push(`cancelled #${msg.id}: ${verdict.reason}`)
        continue
      }

      // Per-lead minimum gap
      const gapCutoff = new Date(Date.now() - settings.min_seconds_between * 1000).toISOString()
      const { data: recent } = await supabase
        .from('sa_outbound_queue')
        .select('id')
        .eq('lead_id', msg.lead_id)
        .eq('status', 'sent')
        .gte('sent_at', gapCutoff)
        .limit(1)
      if (recent && recent.length > 0) continue // try again next tick

      const result = await sendOne(channel, verdict.externalId!, msg.body, msg.kind, msg.template_key)

      if (result.ok) {
        await supabase.from('sa_outbound_queue').update({
          status: 'sent', sent_at: new Date().toISOString(),
        }).eq('id', msg.id)
        if (msg.conversation_id) {
          await supabase.from('sa_messages').insert({
            conversation_id: msg.conversation_id,
            direction: 'out',
            body: msg.body,
            template_key: msg.template_key,
            sent_by: 'agent',
            status: 'sent',
            meta: { external_id: result.externalMessageId, dry_run: process.env.AGENTS_DRY_RUN === 'true' },
          })
        }
        await supabase.from('sa_leads').update({ last_contact_at: new Date().toISOString() }).eq('id', msg.lead_id)
        report.sent++
        sentThisChannel++
      } else {
        await handleSendError(msg.id, msg.lead_id, channel, result, msg.template_key)
        report.failed++
        report.details.push(`failed #${msg.id}: ${result.errorCode} ${result.errorMessage ?? ''}`)
      }
    }
  }

  return report
}

/** Re-check everything at send time (masterplan §5.3). */
async function checkSendable(
  leadId: string, channel: string, kind: string
): Promise<{ allowed: boolean; reason?: string; externalId?: string }> {
  const supabase = createServiceRoleClient()

  const [{ data: lead }, { data: identity }, { data: suppressions }, { data: consents }] = await Promise.all([
    supabase.from('sa_leads').select('tz_offset, status').eq('id', leadId).single(),
    supabase.from('sa_identities').select('external_id, is_us_number').eq('lead_id', leadId).eq('channel', channel).single(),
    supabase.from('sa_suppressions').select('lead_id, channel').or(`lead_id.eq.${leadId}`),
    supabase.from('sa_consents').select('channel, kind, revoked_at').eq('lead_id', leadId).eq('channel', channel).is('revoked_at', null),
  ])

  if (!lead)     return { allowed: false, reason: 'lead not found' }
  if (!identity) return { allowed: false, reason: 'no identity on channel' }

  const windowOpen = await isWindowOpen(leadId, channel)
  const contactKind = kind === 'template' ? 'marketing' : kind === 'reply' ? 'transactional' : 'marketing'

  const verdict = canContact({
    leadId,
    channel: channel as 'whatsapp' | 'instagram' | 'messenger',
    kind: contactKind,
    hasExplicitOptIn: (consents ?? []).length > 0,
    windowOpen,
    isUsPhoneNumber: identity.is_us_number,
    recipientUtcOffset: lead.tz_offset,
    suppressions: (suppressions ?? []).map(s => ({ lead_id: s.lead_id as string, channel: s.channel as string })),
    globalPaused: false,   // already checked by dispatch
    agentEnabled: true,
  })

  if (!verdict.allowed) return { allowed: false, reason: verdict.reason }
  return { allowed: true, externalId: identity.external_id }
}

async function sendOne(
  channel: string, externalId: string, body: string, kind: string, templateKey: string | null
): Promise<SendResult> {
  if (channel === 'whatsapp') {
    if (kind === 'template' && templateKey) return sendWhatsAppTemplate(externalId, templateKey)
    return sendWhatsAppText(externalId, body)
  }
  return sendMetaDm(channel as 'instagram' | 'messenger', externalId, body)
}

/** Error-code rules from masterplan §5.3. */
async function handleSendError(
  queueId: number, leadId: string, channel: string, result: SendResult, templateKey: string | null
) {
  const supabase = createServiceRoleClient()
  const code = result.errorCode

  if (code === '131049') {
    // Marketing template blocked (US): never retry that template to that lead
    await supabase.from('sa_outbound_queue').update({
      status: 'failed', cancel_reason: `131049 marketing template blocked (US) — never retry ${templateKey}`,
    }).eq('id', queueId)
  } else if (code === '131047') {
    // Window closed: no free-form retry
    await supabase.from('sa_outbound_queue').update({
      status: 'failed', cancel_reason: '131047 window closed — no free-form retry',
    }).eq('id', queueId)
  } else if (code === '130429') {
    // Rate limited: exponential backoff
    const { data: row } = await supabase.from('sa_outbound_queue').select('attempts').eq('id', queueId).single()
    const attempts = (row?.attempts ?? 0) + 1
    if (attempts >= 5) {
      await supabase.from('sa_outbound_queue').update({ status: 'failed', attempts, cancel_reason: '130429 rate limited — max retries' }).eq('id', queueId)
    } else {
      const backoffMin = Math.pow(2, attempts)  // 2, 4, 8, 16 minutes
      await supabase.from('sa_outbound_queue').update({
        attempts,
        not_before: new Date(Date.now() + backoffMin * 60_000).toISOString(),
      }).eq('id', queueId)
    }
  } else if (code === '131026') {
    // Undeliverable identity: flag it
    await supabase.from('sa_outbound_queue').update({ status: 'failed', cancel_reason: '131026 identity undeliverable — flagged' }).eq('id', queueId)
    await supabase.from('ag_audit_log').insert({
      agent_key: 'sales', action: 'identity_flagged',
      detail: { lead_id: leadId, channel, code: '131026' },
    })
  } else {
    await supabase.from('sa_outbound_queue').update({
      status: 'failed', cancel_reason: `${code}: ${result.errorMessage ?? 'unknown error'}`,
    }).eq('id', queueId)
  }
}

/** Record a STOP: suppress, cancel queued messages, honour within one tick. */
export async function recordOptOut(leadId: string, channel: string) {
  const supabase = createServiceRoleClient()
  await supabase.from('sa_suppressions').upsert(
    { lead_id: leadId, channel, reason: 'stop_request' },
    { onConflict: 'lead_id,channel' }
  )
  await supabase
    .from('sa_outbound_queue')
    .update({ status: 'cancelled', cancel_reason: 'opt-out' })
    .eq('lead_id', leadId)
    .eq('status', 'queued')
  await supabase.from('ag_audit_log').insert({
    agent_key: 'sales', action: 'opt_out_recorded', detail: { lead_id: leadId, channel },
  })
}
