/**
 * Browser-side order persistence.
 *
 * Order state used to live only in localStorage, so clearing site data,
 * switching devices, or opening the flow in a private window lost an
 * in-progress payment.  Orders are now written to /api/orders as well, and
 * localStorage is demoted to an optimistic cache:
 *
 *   • on create  — cache immediately, then POST to the server
 *   • on load    — render the cached copy, then reconcile with the server
 *   • on update  — cache immediately, then PATCH the server
 *
 * Every network helper here resolves rather than throwing.  Losing the server
 * round-trip must never break a flow that the cached copy can already render,
 * so failures degrade to the previous localStorage-only behaviour.
 */

import type { OrderKind, StoredOrder } from './types'
import { queueOrderSync } from '@/lib/offline/order-sync-queue'

/** Cache key for a single order — unchanged from the pre-server layout. */
export function orderCacheKey(kind: OrderKind, orderId: string): string {
  return `${kind}:order:${orderId}`
}

/** Cache key for the most recent order of a given kind. */
export function latestOrderCacheKey(kind: OrderKind): string {
  return `${kind}:latest-order`
}

// ---------------------------------------------------------------------------
// localStorage cache
// ---------------------------------------------------------------------------

export function readCachedOrder<T>(kind: OrderKind, orderId: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(orderCacheKey(kind, orderId))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCachedOrder<T>(kind: OrderKind, orderId: string, order: T): void {
  if (typeof window === 'undefined') return

  try {
    const serialised = JSON.stringify(order)
    window.localStorage.setItem(orderCacheKey(kind, orderId), serialised)
    window.localStorage.setItem(latestOrderCacheKey(kind), serialised)
  } catch {
    // Quota exceeded or storage disabled (private mode) — the server copy is
    // the durable one, so this is safe to swallow.
  }
}

// ---------------------------------------------------------------------------
// Server sync
// ---------------------------------------------------------------------------

interface OrderWithStatus {
  id: string
  status: string
}

/**
 * Caches the order, then persists it to the server.
 *
 * Resolves true once the server has the order, false if the request failed —
 * callers may continue either way, since the cached copy still renders.
 */
export async function persistOrder<T extends OrderWithStatus>(
  kind: OrderKind,
  order: T,
  walletAddress: string
): Promise<boolean> {
  writeCachedOrder(kind, order.id, order)

  if (!walletAddress) return false

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: order.id,
        walletAddress,
        kind,
        status: order.status,
        payload: order,
      }),
    })

    if (!response.ok && response.status >= 500) {
      queueOrderSync(kind, order, walletAddress)
    }

    return response.ok
  } catch {
    queueOrderSync(kind, order, walletAddress)
    return false
  }
}

/**
 * Fetches an order from the server.  Returns null when the order is unknown,
 * is owned by another wallet, or the request failed — callers fall back to the
 * cached copy.
 */
export async function fetchOrder<T>(
  kind: OrderKind,
  orderId: string,
  walletAddress: string
): Promise<T | null> {
  if (!orderId || !walletAddress) return null

  try {
    const response = await fetch(
      `/api/orders/${encodeURIComponent(orderId)}?walletAddress=${encodeURIComponent(walletAddress)}`
    )
    if (!response.ok) return null

    const body = (await response.json()) as { order?: StoredOrder<T> }
    if (!body.order || body.order.kind !== kind) return null

    // Refresh the cache so the next load renders optimistically from a copy
    // that matches the server.
    writeCachedOrder(kind, orderId, body.order.payload)

    return body.order.payload
  } catch {
    return null
  }
}

/**
 * Lists a wallet's recent orders from the server, newest first.  Returns an
 * empty array on failure.
 */
export async function fetchOrders<T>(
  kind: OrderKind,
  walletAddress: string,
  limit = 20
): Promise<T[]> {
  if (!walletAddress) return []

  try {
    const params = new URLSearchParams({ walletAddress, kind, limit: String(limit) })
    const response = await fetch(`/api/orders?${params.toString()}`)
    if (!response.ok) return []

    const body = (await response.json()) as { orders?: StoredOrder<T>[] }
    return (body.orders ?? []).map((order) => order.payload)
  } catch {
    return []
  }
}

/**
 * Caches the updated order, then pushes the change to the server.
 *
 * The payload is merged server-side, so passing a partial order is safe.
 */
export async function patchOrder<T extends OrderWithStatus>(
  kind: OrderKind,
  order: T,
  walletAddress: string
): Promise<boolean> {
  writeCachedOrder(kind, order.id, order)

  if (!walletAddress) return false

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, status: order.status, payload: order }),
    })

    // The order predates server persistence (or was never saved) — create it
    // so subsequent loads on other devices can find it.
    if (response.status === 404) {
      return persistOrder(kind, order, walletAddress)
    }

    if (!response.ok && response.status >= 500) {
      queueOrderSync(kind, order, walletAddress)
    }

    return response.ok
  } catch {
    queueOrderSync(kind, order, walletAddress)
    return false
  }
}
