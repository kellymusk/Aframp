/**
 * Aframp Push Notification Handler
 *
 * This script is imported by the main service worker (sw.js) to handle
 * incoming Web Push messages and notification click events.
 *
 * The main sw.js calls: importScripts('/push-handler.js')
 * (See next.config.mjs for the sw customisation or self.importScripts call)
 */

/* global self, clients */

// ── Push event ────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: 'Aframp',
      body: event.data.text(),
    }
  }

  const {
    title = 'Aframp',
    body = '',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/badge-72x72.png',
    tag = 'aframp-push',
    url = '/',
    data = {},
  } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url, ...data },
      requireInteraction: false,
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing tab if one matches the target URL
        const existing = windowClients.find((c) => c.url === targetUrl)
        if (existing) {
          return existing.focus()
        }
        // Otherwise open a new tab
        return clients.openWindow(targetUrl)
      })
  )
})

// ── Push subscription change ──────────────────────────────────────────────────

self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-subscribe when the push service rotates the endpoint
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((newSubscription) => {
        // Notify the app so it can update the stored subscription
        return self.clients.matchAll({ type: 'window' }).then((windowClients) => {
          windowClients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: newSubscription.toJSON(),
            })
          })
        })
      })
      .catch((err) => {
        console.error('[push-handler] Re-subscribe failed', err)
      })
  )
})
