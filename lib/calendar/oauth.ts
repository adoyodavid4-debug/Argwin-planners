// lib/calendar/oauth.ts — OAuth 2.0 for Google Calendar & Microsoft Graph.
// Credential-gated: everything no-ops with a clear error until the operator sets
// GOOGLE_CLIENT_ID/SECRET or MS_CLIENT_ID/SECRET. Tokens are stored in
// calendar_integrations (masterplan §10 — encrypt at rest in production).

export type Provider = 'google' | 'microsoft'

interface ProviderCfg {
  authUrl: string
  tokenUrl: string
  scopes: string[]
  clientId: string
  clientSecret: string
  extraAuthParams: Record<string, string>
}

export function isConfigured(provider: Provider): boolean {
  return provider === 'google'
    ? !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET)
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
export function redirectUri(provider: Provider): string {
  return `${siteUrl()}/api/calendar/oauth/${provider}/callback`
}

function cfg(provider: Provider): ProviderCfg | null {
  if (!isConfigured(provider)) return null
  if (provider === 'google') {
    return {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/calendar', 'openid', 'email'],
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    }
  }
  return {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['offline_access', 'openid', 'email', 'Calendars.ReadWrite', 'User.Read'],
    clientId: process.env.MS_CLIENT_ID!,
    clientSecret: process.env.MS_CLIENT_SECRET!,
    extraAuthParams: {},
  }
}

export function authorizeUrl(provider: Provider, state: string): string | null {
  const c = cfg(provider)
  if (!c) return null
  const p = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: redirectUri(provider),
    response_type: 'code',
    scope: c.scopes.join(' '),
    state,
    ...c.extraAuthParams,
  })
  return `${c.authUrl}?${p.toString()}`
}

export interface TokenSet {
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token?: string
}

export async function exchangeCode(provider: Provider, code: string): Promise<TokenSet | null> {
  const c = cfg(provider)
  if (!c) return null
  const body = new URLSearchParams({
    code,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: redirectUri(provider),
    grant_type: 'authorization_code',
  })
  const res = await fetch(c.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) { console.error('[oauth] token exchange failed', provider, await res.text().catch(() => '')); return null }
  return res.json()
}

export async function refreshToken(provider: Provider, refresh_token: string): Promise<TokenSet | null> {
  const c = cfg(provider)
  if (!c) return null
  const body = new URLSearchParams({
    refresh_token,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    grant_type: 'refresh_token',
  })
  const res = await fetch(c.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) { console.error('[oauth] refresh failed', provider, await res.text().catch(() => '')); return null }
  return res.json()
}

// Best-effort email from an OpenID id_token (no signature verification needed —
// it came straight from the provider's token endpoint over TLS).
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null
  try {
    const payload = idToken.split('.')[1]
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    return json.email ?? json.preferred_username ?? null
  } catch { return null }
}

// A valid access token for a stored integration, refreshing if it's near expiry.
// Returns the token and persists any refreshed token back to the row.
export async function validAccessToken(supabase: any, integration: any): Promise<string | null> {
  const provider = integration.provider as Provider
  const expiresAt = integration.meta?.expires_at ? new Date(integration.meta.expires_at).getTime() : 0
  if (integration.access_token && expiresAt - Date.now() > 60_000) return integration.access_token
  if (!integration.refresh_token) return integration.access_token ?? null

  const t = await refreshToken(provider, integration.refresh_token)
  if (!t) return null
  const meta = { ...(integration.meta ?? {}), expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString() }
  await supabase.from('calendar_integrations').update({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? integration.refresh_token,
    meta,
  }).eq('id', integration.id)
  return t.access_token
}
