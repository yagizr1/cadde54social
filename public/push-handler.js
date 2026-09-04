self.addEventListener('push', (event) => {
  let data = {
    title: 'Cadde54 Social',
    body: 'Yeni bildirim',
    url: '/app/',
    tag: 'c54',
  }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    try {
      data.body = event.data.text()
    } catch {
      /* default */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Cadde54 Social', {
      body: data.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: data.tag || 'c54',
      renotify: Boolean(data.renotify),
      data: { url: data.url || '/app/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/app/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(url)
            } catch {
              /* ignore */
            }
          }
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
