// Window state machine per (lead, channel) — masterplan §5.2.
// Free-form messages only inside an open window; WhatsApp templates outside
// windows only with consent + an allowed category; IG/Messenger send nothing
// promotional outside the window.
import { createServiceRoleClient } from '@/lib/supabase/server'

export type WindowKind = 'service_24h' | 'free_entry_72h' | 'ad_window'

const WINDOW_HOURS: Record<WindowKind, number> = {
  service_24h:   24,
  free_entry_72h: 72,
  ad_window:     24, // Meta's CTM ad window — verify current value before go-live
}

/** Open (or extend) a window for a lead/channel. Inbound messages call this. */
export async function openWindow(leadId: string, channel: string, kind: WindowKind) {
  const supabase = createServiceRoleClient()
  const expiresAt = new Date(Date.now() + WINDOW_HOURS[kind] * 3_600_000).toISOString()
  await supabase.from('sa_windows').insert({
    lead_id: leadId,
    channel,
    kind,
    expires_at: expiresAt,
  })
}

/** Is any window currently open for this lead/channel? Checked again at send time. */
export async function isWindowOpen(leadId: string, channel: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('sa_windows')
    .select('id')
    .eq('lead_id', leadId)
    .eq('channel', channel)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
  return !!data && data.length > 0
}
