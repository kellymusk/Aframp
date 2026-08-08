import {
  flushQueuedOrderSync,
  getQueuedOrderSyncCount,
  queueOrderSync,
} from '@/lib/offline/order-sync-queue'

const mockFetch = jest.fn()
const WALLET = 'GAWALLETONE'
const ORDER = { id: 'order-1', status: 'created', amount: 50000 }

function response(ok: boolean, status: number): Response {
  return { ok, status } as Response
}

beforeEach(() => {
  window.localStorage.clear()
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
})

describe('offline order sync queue', () => {
  it('keeps only the latest state for an order', async () => {
    queueOrderSync('onramp', ORDER, WALLET)
    queueOrderSync('onramp', { ...ORDER, status: 'completed' }, WALLET)
    mockFetch.mockResolvedValue(response(true, 200))

    expect(getQueuedOrderSyncCount()).toBe(1)

    await expect(flushQueuedOrderSync()).resolves.toEqual({
      completed: 1,
      remaining: 0,
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      id: 'order-1',
      status: 'completed',
      payload: { status: 'completed' },
    })
  })

  it('replays queued requests in order and removes successful ones', async () => {
    queueOrderSync('onramp', ORDER, WALLET)
    queueOrderSync('offramp', { ...ORDER, id: 'order-2' }, WALLET)
    mockFetch.mockResolvedValue(response(true, 200))

    await expect(flushQueuedOrderSync()).resolves.toEqual({
      completed: 2,
      remaining: 0,
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/orders',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('retains the failed request and later requests after a transient failure', async () => {
    queueOrderSync('onramp', ORDER, WALLET)
    queueOrderSync('offramp', { ...ORDER, id: 'order-2' }, WALLET)
    mockFetch.mockResolvedValue(response(false, 503))

    await expect(flushQueuedOrderSync()).resolves.toEqual({
      completed: 0,
      remaining: 2,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('drops permanently rejected requests so they do not block the queue', async () => {
    queueOrderSync('onramp', ORDER, WALLET)
    mockFetch.mockResolvedValue(response(false, 400))

    await expect(flushQueuedOrderSync()).resolves.toEqual({
      completed: 1,
      remaining: 0,
    })
  })
})
