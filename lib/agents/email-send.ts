// Branded email sender for agent-generated email (campaigns, flows, reports).
// Dry-run aware; checks suppression at send time; every marketing email gets
// a one-click unsubscribe link and the business postal address (UK GDPR /
// CAN-SPAM). Uses Resend directly so agent emails don't depend on the
// storefront template registry.
import { createServiceRoleClient } from '@/lib/supabase/server'

const POSTAL = process.env.BUSINESS_POSTAL_ADDRESS ?? '{{BUSINESS_POSTAL_ADDRESS}}'
const FROM   = process.env.AGENTS_EMAIL_FROM ?? 'Arwign Planners <hello@arwignplanners.com>'
const SITE   = 'https://www.arwignplanners.com'

export interface AgentEmailInput {
  to: string
  subject: string
  bodyHtml: string            // inner content; the branded shell is added here
  kind: 'marketing' | 'transactional'
  idempotencyKey: string
}

export async function sendAgentEmail(input: AgentEmailInput): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createServiceRoleClient()

  // Suppression check at send time
  if (input.kind === 'marketing') {
    const { data: consent } = await supabase
      .from('contacts_consent')
      .select('status')
      .eq('email', input.to)
      .eq('kind', 'marketing')
      .single()
    if (!consent || consent.status !== 'confirmed') {
      return { ok: false, reason: 'no confirmed marketing consent' }
    }
  }

  if (process.env.AGENTS_DRY_RUN === 'true') {
    await supabase.from('ag_audit_log').insert({
      agent_key: 'email', action: 'email_dry_run',
      detail: { to: input.to, subject: input.subject, kind: input.kind },
    })
    return { ok: true, reason: 'dry run' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, reason: 'RESEND_API_KEY not set' }

  const unsubUrl = `${SITE}/unsubscribe?email=${encodeURIComponent(input.to)}`
  const footer = input.kind === 'marketing'
    ? `<hr style="border:none;border-top:1px solid #EDE8DC;margin:28px 0 16px"/>
       <p style="font-size:12px;color:#8a8577;font-family:Poppins,Arial,sans-serif">
         You're receiving this because you subscribed at arwignplanners.com.
         <a href="${unsubUrl}" style="color:#C9A84C">Unsubscribe</a> at any time.<br/>
         Arwign Planners · ${POSTAL}
       </p>`
    : `<hr style="border:none;border-top:1px solid #EDE8DC;margin:28px 0 16px"/>
       <p style="font-size:12px;color:#8a8577;font-family:Poppins,Arial,sans-serif">Arwign Planners · ${POSTAL}</p>`

  const html = `<!doctype html><html><body style="margin:0;background:#F5F0E8;padding:24px 0">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;font-family:Poppins,Arial,sans-serif;color:#3a3530">
      <h1 style="font-family:Lora,Georgia,serif;font-size:22px;color:#3a3530;margin:0 0 20px">Arwign Planners</h1>
      ${input.bodyHtml}
      ${footer}
    </div></body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM, to: input.to, subject: input.subject, html,
      headers: input.kind === 'marketing'
        ? { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        : undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, reason: `Resend ${res.status}: ${err.slice(0, 200)}` }
  }
  return { ok: true }
}
