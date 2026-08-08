'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useWallet } from '@/hooks/useWallet'

export interface NotificationItem {
  id: string
  userId: string
  title: string
  message: string
  category: 'payment' | 'onramp' | 'offramp' | 'price_alert' | 'kyc' | 'system'
  priority: 'low' | 'normal' | 'high'
  isRead: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

interface NotificationContextType {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  /** Programmatically create a notification for the current user. */
  push: (input: {
    title: string
    message: string
    category: NotificationItem['category']
    priority?: NotificationItem['priority']
    metadata?: Record<string, unknown>
  }) => Promise<void>
  refresh: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

/** How long before falling back from SSE to plain polling (ms). */
const SSE_CONNECT_TIMEOUT = 4_000
/** Polling interval when SSE is unavailable (ms). */
const POLL_INTERVAL = 15_000

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const sseRef = useRef<EventSource | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshRef = useRef<() => void>(() => {})

  // ------------------------------------------------------------------
  // Core fetch
  // ------------------------------------------------------------------
  const fetchNotifications = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
      if (!res.ok) return
      const data = (await res.json()) as {
        notifications: NotificationItem[]
        unread: number
      }
      setNotifications(data.notifications ?? [])
    } catch {
      // network error — keep stale state
    } finally {
      setLoading(false)
    }
  }, [])

  // ------------------------------------------------------------------
  // SSE connection with polling fallback
  // ------------------------------------------------------------------
  const connectSSE = useCallback(
    (userId: string) => {
      // Tear down any existing connection/timer
      sseRef.current?.close()
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)

      let usedSSE = false

      const es = new EventSource(
        `/api/notifications/stream?userId=${encodeURIComponent(userId)}`
      )
      sseRef.current = es

      const applyPayload = (data: { notifications: NotificationItem[]; unread: number }) => {
        setNotifications(data.notifications ?? [])
      }

      es.addEventListener('snapshot', (e) => {
        usedSSE = true
        applyPayload(JSON.parse(e.data))
      })

      es.addEventListener('update', (e) => {
        applyPayload(JSON.parse(e.data))
      })

      es.onerror = () => {
        es.close()
        sseRef.current = null
        // Fall back to polling
        startPolling(userId)
      }

      // If SSE hasn't delivered anything within the timeout, fall back too
      setTimeout(() => {
        if (!usedSSE) {
          es.close()
          sseRef.current = null
          startPolling(userId)
        }
      }, SSE_CONNECT_TIMEOUT)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchNotifications]
  )

  const startPolling = useCallback(
    (userId: string) => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      void fetchNotifications(userId)
      pollTimerRef.current = setInterval(() => void fetchNotifications(userId), POLL_INTERVAL)
    },
    [fetchNotifications]
  )

  // Keep refreshRef in sync so we can call it imperatively
  const refresh = useCallback(() => {
    if (publicKey) void fetchNotifications(publicKey)
  }, [publicKey, fetchNotifications])

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  // Connect/disconnect when wallet changes
  useEffect(() => {
    if (!publicKey) {
      sseRef.current?.close()
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      setNotifications([])
      return
    }

    setLoading(true)
    connectSSE(publicKey)

    return () => {
      sseRef.current?.close()
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [publicKey, connectSSE])

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
  }, [])

  const markAllRead = useCallback(async () => {
    if (!publicKey) return
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await fetch(`/api/notifications?userId=${encodeURIComponent(publicKey)}`, {
      method: 'PATCH',
    })
  }, [publicKey])

  const push = useCallback(
    async (input: {
      title: string
      message: string
      category: NotificationItem['category']
      priority?: NotificationItem['priority']
      metadata?: Record<string, unknown>
    }) => {
      if (!publicKey) return
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: publicKey, ...input }),
      })
      refreshRef.current()
    },
    [publicKey]
  )

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, markRead, markAllRead, push, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
