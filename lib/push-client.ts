/**
 * Client-side Web Push registration utility
 *
 * Usage:
 *   import { subscribeToPush, unsubscribeFromPush } from '@/lib/push-client'
 *
 *   // In a React component or settings page:
 *   const sub = await subscribeToPush(userId)
 *   // sub is the PushSubscription or null on failure
 */

/** Convert a base64url VAPID public key to a Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

/**
 * Subscribe the current browser to Web Push notifications and save the
 * subscription to the server for a given user.
 *
 * @returns The PushSubscription on success, or null if unavailable / denied.
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push-client] Push notifications not supported in this environment')
    return null
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    console.warn('[push-client] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
    return null
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('[push-client] Notification permission denied')
      return null
    }

    // Register (or retrieve) the service worker
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    // Save subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
    })

    if (!response.ok) {
      console.error('[push-client] Failed to save subscription to server', await response.text())
      // Don't throw — the browser subscription is still valid, we just couldn't persist it
    }

    return subscription
  } catch (err) {
    console.error('[push-client] subscribeToPush error', err)
    return null
  }
}

/**
 * Unsubscribe the current browser from Web Push and remove the subscription
 * from the server.
 *
 * @returns true if successfully unsubscribed.
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return true // Already unsubscribed
    }

    const endpoint = subscription.endpoint

    // Remove from browser
    await subscription.unsubscribe()

    // Remove from server
    await fetch('/api/push/unsubscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, endpoint }),
    }).catch((err) => {
      console.warn('[push-client] Failed to remove subscription from server', err)
    })

    return true
  } catch (err) {
    console.error('[push-client] unsubscribeFromPush error', err)
    return false
  }
}

/**
 * Check whether the current browser is subscribed to push notifications.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}
