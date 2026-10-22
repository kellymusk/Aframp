'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

/** Convert a base64 string to a Uint8Array for the subscribe() call. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface UsePushNotificationsReturn {
  permission: PushPermission
  subscribed: boolean
  loading: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

/**
 * Manages Web Push notification subscription lifecycle.
 *
 * - Registers the service worker on mount (if supported)
 * - Tracks browser permission state
 * - Provides subscribe/unsubscribe actions
 * - Handles iOS gracefully (reports unsupported)
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const swRef = useRef<ServiceWorkerRegistration | null>(null)

  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported')
      return
    }

    // Check current permission
    if (Notification.permission === 'granted') setPermission('granted')
    else if (Notification.permission === 'denied') setPermission('denied')

    // Register service worker
    let cancelled = false
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (cancelled) return
        swRef.current = reg

        // Check if already subscribed
        return reg.pushManager.getSubscription()
      })
      .then((sub) => {
        if (cancelled) return
        setSubscribed(!!sub)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[push] SW registration failed:', err)
        setError('Could not register push notifications')
      })

    // Listen for permission changes (some browsers support this)
    const handler = () => {
      setPermission(Notification.permission as PushPermission)
    }
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          status.addEventListener('change', handler)
        })
        .catch(() => {
          // Fallback: poll occasionally or rely on user action
        })
    }

    return () => {
      cancelled = true
    }
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !swRef.current) {
      setError('Push notifications are not supported on this device.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermission(result as PushPermission)
        if (result !== 'granted') {
          setError('Permission denied. Enable notifications in your browser settings to opt in.')
          setLoading(false)
          return
        }
      }

      const reg = swRef.current

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()
      const keys = json.keys as { p256dh: string; auth: string }

      // Store on backend (caller will provide the API method)
      // We emit a custom event so the settings page can call the API with the token
      window.dispatchEvent(
        new CustomEvent('aframp:push-subscribe', {
          detail: {
            endpoint: json.endpoint!,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        })
      )

      setSubscribed(true)
    } catch (err) {
      console.error('[push] Subscribe failed:', err)
      setError(err instanceof Error ? err.message : 'Could not enable push notifications')
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !swRef.current) return
    setLoading(true)
    setError(null)

    try {
      const sub = await swRef.current.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
      }
      // Notify backend (caller handles API call via event)
      window.dispatchEvent(new CustomEvent('aframp:push-unsubscribe'))
      setSubscribed(false)
    } catch (err) {
      console.error('[push] Unsubscribe failed:', err)
      setError(err instanceof Error ? err.message : 'Could not disable push notifications')
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  return { permission, subscribed, loading, error, subscribe, unsubscribe }
}