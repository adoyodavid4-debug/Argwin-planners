// lib/calendar/sync.ts — two-way sync with Google Calendar & Microsoft Graph.
// Pull: incremental via Google syncToken / Microsoft delta link (stored in
// calendar_integrations.sync_token). Push: native events not yet mirrored are
// created upstream. Loop-safe — provider-origin rows carry source='google'|
// 'microsoft' and are never pushed back; native rows gain an external_id once
// pushed so they aren't duplicated on the next pull.

import { validAccessToken } from './oauth'

export interface SyncResult { pulled: number; pushed: number; deleted: number; error?: string }

export async function syncIntegration(supabase: any, integration: any): Promise<SyncResult> {
  const token = await validAccessToken(supabase, integration)
  if (!token) return { pulled: 0, pushed: 0, deleted: 0, error: 'no_valid_token' }
  try {
    const r = integration.provider === 'google'
      ? await syncGoogle(supabase, integration, token)
      : await syncMicrosoft(supabase, integration, token)
    await supabase.from('calendar_integrations').update({ status: 'connected', meta: { ...(integration.meta ?? {}), last_sync: new Date().toISOString() } }).eq('id', integration.id)
    return r
  } catch (e: any) {
    console.error('[sync] failed', integration.provider, e?.message)
    await supabase.from('calendar_integrations').update({ status: 'error', meta: { ...(integration.meta ?? {}), last_error: String(e?.message ?? e) } }).eq('id', integration.id)
    return { pulled: 0, pushed: 0, deleted: 0, error: String(e?.message ?? e) }
  }
}

// ── Google ────────────────────────────────────────────────────
async function syncGoogle(supabase: any, integration: any, token: string): Promise<SyncResult> {
  const userId = integration.user_id
  let pulled = 0, deleted = 0, pushed = 0
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
  const headers = { Authorization: `Bearer ${token}` }

  let pageToken: string | undefined
  let nextSyncToken: string | undefined
  let syncToken: string | null = integration.sync_token
  let guard = 0

  do {
    const p = new URLSearchParams({ singleEvents: 'false', showDeleted: 'true', maxResults: '250' })
    if (syncToken) p.set('syncToken', syncToken)
    else p.set('timeMin', new Date(Date.now() - 60 * 86400_000).toISOString())
    if (pageToken) p.set('pageToken', pageToken)

    const res = await fetch(`${base}?${p.toString()}`, { headers })
    if (res.status === 410) { // sync token expired → full resync
      await supabase.from('calendar_integrations').update({ sync_token: null }).eq('id', integration.id)
      syncToken = null; pageToken = undefined; continue
    }
    if (!res.ok) throw new Error(`google list ${res.status}`)
    const json = await res.json()

    for (const item of json.items ?? []) {
      if (item.status === 'cancelled') {
        const { count } = await supabase.from('calendar_events').delete({ count: 'exact' })
          .eq('user_id', userId).eq('external_provider', 'google').eq('external_id', item.id)
        if (count) deleted += count
        continue
      }
      const row = mapGoogleEvent(userId, item)
      if (!row) continue
      await supabase.from('calendar_events').upsert(row, { onConflict: 'user_id,external_provider,external_id' })
      pulled++
    }
    pageToken = json.nextPageToken
    nextSyncToken = json.nextSyncToken ?? nextSyncToken
    guard++
  } while (pageToken && guard < 20)

  if (nextSyncToken) await supabase.from('calendar_integrations').update({ sync_token: nextSyncToken }).eq('id', integration.id)

  // Push native events not yet mirrored.
  const { data: toPush } = await supabase.from('calendar_events').select('*')
    .eq('user_id', userId).eq('source', 'native').is('external_id', null).limit(50)
  for (const ev of (toPush ?? []) as any[]) {
    const body: any = {
      summary: ev.title, description: ev.description ?? undefined, location: ev.location ?? undefined,
      start: ev.all_day ? { date: ev.start_at.slice(0, 10) } : { dateTime: ev.start_at, timeZone: ev.start_tz || 'UTC' },
      end: ev.all_day ? { date: ev.end_at.slice(0, 10) } : { dateTime: ev.end_at, timeZone: ev.start_tz || 'UTC' },
    }
    if (ev.rrule) body.recurrence = [ev.rrule.startsWith('RRULE') ? ev.rrule : `RRULE:${ev.rrule}`]
    const res = await fetch(base, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const created = await res.json()
      await supabase.from('calendar_events').update({ external_provider: 'google', external_id: created.id, etag: created.etag }).eq('id', ev.id)
      pushed++
    }
  }
  return { pulled, pushed, deleted }
}

function mapGoogleEvent(userId: string, item: any) {
  const start = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00Z` : null)
  const end = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00Z` : null)
  if (!start || !end) return null
  const rrule = Array.isArray(item.recurrence) ? item.recurrence.find((r: string) => r.startsWith('RRULE')) ?? null : null
  return {
    user_id: userId, external_provider: 'google', external_id: item.id, etag: item.etag ?? null, source: 'google',
    title: item.summary || '(no title)', description: item.description ?? null, location: item.location ?? null,
    all_day: !!item.start?.date, start_at: new Date(start).toISOString(), end_at: new Date(end).toISOString(),
    start_tz: item.start?.timeZone ?? 'UTC', rrule, colour: 'sage',
    conferencing: item.hangoutLink ?? null,
  }
}

// ── Microsoft Graph ───────────────────────────────────────────
async function syncMicrosoft(supabase: any, integration: any, token: string): Promise<SyncResult> {
  const userId = integration.user_id
  let pulled = 0, deleted = 0, pushed = 0
  const headers = { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' }

  let url: string = integration.sync_token
    || `https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${encodeURIComponent(new Date(Date.now() - 60 * 86400_000).toISOString())}&endDateTime=${encodeURIComponent(new Date(Date.now() + 365 * 86400_000).toISOString())}`
  let deltaLink: string | undefined
  let guard = 0

  while (url && guard < 30) {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`ms delta ${res.status}`)
    const json = await res.json()
    for (const item of json.value ?? []) {
      if (item['@removed']) {
        const { count } = await supabase.from('calendar_events').delete({ count: 'exact' })
          .eq('user_id', userId).eq('external_provider', 'microsoft').eq('external_id', item.id)
        if (count) deleted += count
        continue
      }
      const row = mapMicrosoftEvent(userId, item)
      if (!row) continue
      await supabase.from('calendar_events').upsert(row, { onConflict: 'user_id,external_provider,external_id' })
      pulled++
    }
    if (json['@odata.nextLink']) { url = json['@odata.nextLink']; }
    else { deltaLink = json['@odata.deltaLink']; url = '' }
    guard++
  }
  if (deltaLink) await supabase.from('calendar_integrations').update({ sync_token: deltaLink }).eq('id', integration.id)

  // Push native events not yet mirrored.
  const { data: toPush } = await supabase.from('calendar_events').select('*')
    .eq('user_id', userId).eq('source', 'native').is('external_id', null).limit(50)
  for (const ev of (toPush ?? []) as any[]) {
    const body: any = {
      subject: ev.title,
      body: { contentType: 'text', content: ev.description ?? '' },
      location: ev.location ? { displayName: ev.location } : undefined,
      isAllDay: ev.all_day,
      start: { dateTime: new Date(ev.start_at).toISOString().replace('Z', ''), timeZone: 'UTC' },
      end: { dateTime: new Date(ev.end_at).toISOString().replace('Z', ''), timeZone: 'UTC' },
    }
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const created = await res.json()
      await supabase.from('calendar_events').update({ external_provider: 'microsoft', external_id: created.id, etag: created['@odata.etag'] ?? null }).eq('id', ev.id)
      pushed++
    }
  }
  return { pulled, pushed, deleted }
}

function mapMicrosoftEvent(userId: string, item: any) {
  const s = item.start?.dateTime, e = item.end?.dateTime
  if (!s || !e) return null
  const iso = (v: string) => (v.endsWith('Z') ? v : `${v}Z`)
  return {
    user_id: userId, external_provider: 'microsoft', external_id: item.id, etag: item['@odata.etag'] ?? null, source: 'microsoft',
    title: item.subject || '(no title)', description: item.bodyPreview ?? null,
    location: item.location?.displayName ?? null, all_day: !!item.isAllDay,
    start_at: new Date(iso(s)).toISOString(), end_at: new Date(iso(e)).toISOString(),
    start_tz: 'UTC', rrule: null, colour: 'slate',
    conferencing: item.onlineMeeting?.joinUrl ?? null,
  }
}
