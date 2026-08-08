import {
  fetchOrder,
  fetchOrders,
  orderCacheKey,
  latestOrderCacheKey,
  patchOrder,
  persistOrder,
  readCachedOrder,
  writeCachedOrder,
} from '@/lib/orders/order-client'
import type { StoredOrder } from '@/lib/orders/types'
import { getQueuedOrderSyncCount } from '@/lib/offline/order-sync-queue'

const WALLET = 'GAWALLETONE'

const ORDER = { id: 'order-1', status: 'created', amount: 50000 }

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as Response
}

function storedOrder(payload: unknown, kind: 'onramp' | 'offramp' = 'onramp'): StoredOrder {
  return {
    id: 'order-1',
    walletAddress: WALLET,
    kind,
    status: 'created',
    payload: payload as Record<string, unknown>,
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
  }
}

const mockFetch = jest.fn()

beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
})

describe('cache helpers', () => {
  it('writes both the per-order and latest-order keys', () => {
    writeCachedOrder('onramp', 'order-1', ORDER)

    expect(localStorage.getItem(orderCacheKey('onramp', 'order-1'))).toBe(JSON.stringify(ORDER))
    expect(localStorage.getItem(latestOrderCacheKey('onramp'))).toBe(JSON.stringify(ORDER))
  })

  it('reads back what it wrote', () => {
    writeCachedOrder('offramp', 'order-9', ORDER)

    expect(readCachedOrder('offramp', 'order-9')).toEqual(ORDER)
  })

  it('returns null for a missing or corrupt entry', () => {
    expect(readCachedOrder('onramp', 'nope')).toBeNull()

    localStorage.setItem(orderCacheKey('onramp', 'bad'), '{not json')
    expect(readCachedOrder('onramp', 'bad')).toBeNull()
  })
})

describe('persistOrder', () => {
  it('caches the order and posts it to the server', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ order: storedOrder(ORDER) }))

    await expect(persistOrder('onramp', ORDER, WALLET)).resolves.toBe(true)

    expect(readCachedOrder('onramp', 'order-1')).toEqual(ORDER)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/orders')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      id: 'order-1',
      walletAddress: WALLET,
      kind: 'onramp',
      status: 'created',
      payload: ORDER,
    })
  })

  it('still caches the order when the request fails', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))

    await expect(persistOrder('onramp', ORDER, WALLET)).resolves.toBe(false)
    expect(readCachedOrder('onramp', 'order-1')).toEqual(ORDER)
    expect(getQueuedOrderSyncCount()).toBe(1)
  })

  it('queues order sync when the server has a transient failure', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, { ok: false, status: 503 }))

    await expect(persistOrder('onramp', ORDER, WALLET)).resolves.toBe(false)
    expect(getQueuedOrderSyncCount()).toBe(1)
  })

  it('skips the request when there is no wallet address', async () => {
    await expect(persistOrder('onramp', ORDER, '')).resolves.toBe(false)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(readCachedOrder('onramp', 'order-1')).toEqual(ORDER)
  })
})

describe('fetchOrder', () => {
  it('returns the server payload and refreshes the cache', async () => {
    const serverCopy = { ...ORDER, status: 'completed' }
    mockFetch.mockResolvedValue(jsonResponse({ order: storedOrder(serverCopy) }))

    await expect(fetchOrder('onramp', 'order-1', WALLET)).resolves.toEqual(serverCopy)

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/orders/order-1?walletAddress=${encodeURIComponent(WALLET)}`
    )
    expect(readCachedOrder('onramp', 'order-1')).toEqual(serverCopy)
  })

  it('returns null when the order is unknown', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 'Order not found' }, { ok: false, status: 404 })
    )

    await expect(fetchOrder('onramp', 'order-1', WALLET)).resolves.toBeNull()
  })

  it('returns null when the server copy is the other ramp direction', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ order: storedOrder(ORDER, 'offramp') }))

    await expect(fetchOrder('onramp', 'order-1', WALLET)).resolves.toBeNull()
  })

  it('returns null instead of throwing when the network fails', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))

    await expect(fetchOrder('onramp', 'order-1', WALLET)).resolves.toBeNull()
  })

  it('skips the request without an order id or wallet address', async () => {
    await expect(fetchOrder('onramp', '', WALLET)).resolves.toBeNull()
    await expect(fetchOrder('onramp', 'order-1', '')).resolves.toBeNull()

    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('fetchOrders', () => {
  it('unwraps the payloads', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ orders: [storedOrder(ORDER)] }))

    await expect(fetchOrders('onramp', WALLET)).resolves.toEqual([ORDER])
  })

  it('returns an empty array when the request fails', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))

    await expect(fetchOrders('onramp', WALLET)).resolves.toEqual([])
  })
})

describe('patchOrder', () => {
  it('caches the update and patches the server', async () => {
    const updated = { ...ORDER, status: 'completed' }
    mockFetch.mockResolvedValue(jsonResponse({ order: storedOrder(updated) }))

    await expect(patchOrder('onramp', updated, WALLET)).resolves.toBe(true)

    expect(readCachedOrder('onramp', 'order-1')).toEqual(updated)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/orders/order-1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({
      walletAddress: WALLET,
      status: 'completed',
      payload: updated,
    })
  })

  it('creates the order when the server has never seen it', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ error: 'Order not found' }, { ok: false, status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ order: storedOrder(ORDER) }))

    await expect(patchOrder('onramp', ORDER, WALLET)).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[1][0]).toBe('/api/orders')
    expect(mockFetch.mock.calls[1][1].method).toBe('POST')
  })

  it('still caches the update when the request fails', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))

    await expect(patchOrder('onramp', ORDER, WALLET)).resolves.toBe(false)
    expect(readCachedOrder('onramp', 'order-1')).toEqual(ORDER)
    expect(getQueuedOrderSyncCount()).toBe(1)
  })
})
