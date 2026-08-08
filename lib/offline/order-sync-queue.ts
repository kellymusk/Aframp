import type { OrderKind } from '@/lib/orders/types'

const ORDER_SYNC_QUEUE_KEY = 'aframp:offline-order-sync'
const MAX_QUEUED_ORDERS = 50

export const ORDER_SYNC_QUEUE_EVENT = 'aframp:offline-order-sync'

interface OrderWithStatus {
  id: string
  status: string
}

interface QueuedOrderSync {
  id: string
  orderKey: string
  body: string
  queuedAt: number
}

export interface FlushOrderSyncResult {
  completed: number
  remaining: number
}

let activeFlush: Promise<FlushOrderSyncResult> | null = null

function readQueue(): QueuedOrderSync[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = JSON.parse(window.localStorage.getItem(ORDER_SYNC_QUEUE_KEY) ?? '[]') as unknown

    if (!Array.isArray(stored)) return []

    return stored.filter(
      (item): item is QueuedOrderSync =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.orderKey === 'string' &&
        typeof item.body === 'string' &&
        typeof item.queuedAt === 'number'
    )
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedOrderSync[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(ORDER_SYNC_QUEUE_KEY, JSON.stringify(queue))
    window.dispatchEvent(new CustomEvent(ORDER_SYNC_QUEUE_EVENT))
  } catch {
    // The local order cache remains available when queue persistence fails.
  }
}

function removeCompletedRequest(request: QueuedOrderSync): void {
  writeQueue(readQueue().filter((queued) => queued.id !== request.id))
}

export function getQueuedOrderSyncCount(): number {
  return readQueue().length
}

export function queueOrderSync<T extends OrderWithStatus>(
  kind: OrderKind,
  order: T,
  walletAddress: string
): void {
  if (typeof window === 'undefined' || !walletAddress) return

  const orderKey = `${kind}:${order.id}`
  const request: QueuedOrderSync = {
    id: `${orderKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    orderKey,
    body: JSON.stringify({
      id: order.id,
      walletAddress,
      kind,
      status: order.status,
      payload: order,
    }),
    queuedAt: Date.now(),
  }

  const withoutOlderCopy = readQueue().filter((queued) => queued.orderKey !== orderKey)
  writeQueue([...withoutOlderCopy, request].slice(-MAX_QUEUED_ORDERS))
}

async function performFlush(): Promise<FlushOrderSyncResult> {
  const queued = readQueue()
  let completed = 0

  for (const request of queued) {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: request.body,
      })

      if (response.ok || response.status < 500) {
        removeCompletedRequest(request)
        completed += 1
        continue
      }

      break
    } catch {
      break
    }
  }

  return {
    completed,
    remaining: getQueuedOrderSyncCount(),
  }
}

export function flushQueuedOrderSync(): Promise<FlushOrderSyncResult> {
  if (activeFlush) return activeFlush

  activeFlush = performFlush().finally(() => {
    activeFlush = null
  })

  return activeFlush
}
