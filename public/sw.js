// Shows stop and target alerts sent by convex/push.ts, and opens the journal
// when one is clicked. Registered by src/lib/push.ts.

// Control open tabs right away, so a click can move one to the journal.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const alert = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(alert.title || 'Quant Companion alert', {
      body: alert.body,
      tag: alert.tag,
      icon: '/icon-192.png',
      badge: '/icon-48.png',
      data: { url: alert.url || '/journal' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data.url, self.location.origin)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const open = windows.find(
        (client) => new URL(client.url).origin === url.origin,
      )
      try {
        if (open) {
          await open.focus()
          await open.navigate(url.href)
          return
        }
      } catch {
        // A tab this worker does not control cannot be moved. Open a new one.
      }
      await self.clients.openWindow(url.href)
    })(),
  )
})
