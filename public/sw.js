// Arwign Calendar service worker — Web Push + notification handling.
// Intentionally conservative: no aggressive caching (the store stays network-first).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) {}
  const title = data.title || 'Arwign Calendar'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: { url: data.url || '/calendar/app' },
      tag: data.tag || undefined,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/calendar/app'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes('/calendar') && 'focus' in w) return w.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
