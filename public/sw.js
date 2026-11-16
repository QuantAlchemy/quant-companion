// Shows stop and target alerts sent by convex/push.ts, and opens the journal
// when one is clicked. Registered by src/lib/push.ts.

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

// Focus a tab that already shows the journal. Otherwise open a new tab, so a
// tab with unsaved work (a trade form, an uploaded file) is never reloaded.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data.url, self.location.origin)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const journal = windows.find((client) => {
        const open = new URL(client.url)
        return open.origin === url.origin && open.pathname === url.pathname
      })
      if (journal) {
        await journal.focus()
        return
      }
      await self.clients.openWindow(url.href)
    })(),
  )
})
