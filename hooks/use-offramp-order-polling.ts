'use client'

import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import type { OfframpOrder } from '@/types/offramp'

const POLL_INTERVAL_MS = 4000
const TERMINAL_STATUSES = new Set(['completed', 'failed'])

/**
 * Polls the order endpoint until it reaches a terminal state. No WebSocket
 * channel exists on the backend yet, so short polling is the simplest way to
 * give the user a live pending → processing → completed/failed view.
 */
export function useOfframpOrderPolling(token: string, order: OfframpOrder) {
  const [current, setCurrent] = useState(order)
  const [error, setError] = useState<string | null>(null)
  const orderIdRef = useRef(order.id)

  useEffect(() => {
    orderIdRef.current = order.id
    setCurrent(order)
  }, [order])

  useEffect(() => {
    if (TERMINAL_STATUSES.has(current.status)) return

    const controller = new AbortController()
    const timer = setInterval(async () => {
      try {
        const next = await api.getOfframpOrder(token, orderIdRef.current, controller.signal)
        setCurrent(next)
        setError(null)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof ApiError ? cause.message : 'Lost connection to order status')
      }
    }, POLL_INTERVAL_MS)

    return () => {
      controller.abort()
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arms only when status leaves/enters terminal
  }, [token, current.status])

  return { order: current, setOrder: setCurrent, error }
}
