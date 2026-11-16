// Channel senders — WhatsApp Cloud API, Instagram and Messenger via Meta
// Graph. Dry-run aware: with AGENTS_DRY_RUN=true nothing leaves the building,
// the message is just marked sent with meta.dry_run. Error codes are mapped
// to the masterplan §5.3 rules by the pacer.
const GRAPH = 'https://graph.facebook.com/v21.0'

export interface SendResult {
  ok: boolean
  externalMessageId?: string
  errorCode?: string   // Meta error code as string, e.g. '131049'
  errorMessage?: string
}

function dryRun(): boolean {
  return process.env.AGENTS_DRY_RUN === 'true'
}

async function graphPost(path: string, body: Record<string, unknown>): Promise<SendResult> {
  const token = process.env.META_SYSTEM_USER_TOKEN
  if (!token) return { ok: false, errorCode: 'no_token', errorMessage: 'META_SYSTEM_USER_TOKEN not set' }

  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({})) as {
    messages?: Array<{ id: string }>
    message_id?: string
    error?: { code: number; error_subcode?: number; message: string }
  }
  if (!res.ok || json.error) {
    const code = json.error?.error_subcode ?? json.error?.code
    return { ok: false, errorCode: code ? String(code) : String(res.status), errorMessage: json.error?.message }
  }
  return { ok: true, externalMessageId: json.messages?.[0]?.id ?? json.message_id }
}

/** Free-form WhatsApp text (only legal inside an open window — pacer enforces). */
export async function sendWhatsAppText(toE164: string, body: string): Promise<SendResult> {
  if (dryRun()) return { ok: true, externalMessageId: `dryrun_${Date.now()}` }
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneId) return { ok: false, errorCode: 'no_phone_id', errorMessage: 'WHATSAPP_PHONE_NUMBER_ID not set' }
  return graphPost(`${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to: toE164.replace('+', ''),
    type: 'text',
    text: { body },
  })
}

/** WhatsApp template message (outside windows; pacer enforces consent + US block). */
export async function sendWhatsAppTemplate(
  toE164: string, templateName: string, language = 'en', components: unknown[] = []
): Promise<SendResult> {
  if (dryRun()) return { ok: true, externalMessageId: `dryrun_${Date.now()}` }
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneId) return { ok: false, errorCode: 'no_phone_id', errorMessage: 'WHATSAPP_PHONE_NUMBER_ID not set' }
  return graphPost(`${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to: toE164.replace('+', ''),
    type: 'template',
    template: { name: templateName, language: { code: language }, components },
  })
}

/** Instagram DM / Messenger reply (only inside windows; pacer enforces). */
export async function sendMetaDm(
  channel: 'instagram' | 'messenger', recipientId: string, text: string
): Promise<SendResult> {
  if (dryRun()) return { ok: true, externalMessageId: `dryrun_${Date.now()}` }
  const pageId = process.env.FB_PAGE_ID
  if (!pageId) return { ok: false, errorCode: 'no_page_id', errorMessage: 'FB_PAGE_ID not set' }
  return graphPost(`${pageId}/messages`, {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text },
  })
}
