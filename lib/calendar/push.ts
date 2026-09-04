// lib/calendar/push.ts — Web Push (VAPID). Gracefully no-ops until the operator
// generates a VAPID keypair (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) and installs
// the `web-push` package. The dynamic require keeps the build green without it.

interface PushPayload { title: string; body: string; url?: string }

export async function sendPush(supabase: any, userId: string, payload: PushPayload): Promise<boolean> {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false

  let webpush: any
  try { webpush = require('web-push') } catch { return false }
  try { webpush.setVapidDetails('mailto:hello@arwignplanners.com', pub, priv) } catch { return false }

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId)
  if (!subs?.length) return false

  let ok = false
  for (const s of subs as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
      ok = true
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }
  return ok
}

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}
