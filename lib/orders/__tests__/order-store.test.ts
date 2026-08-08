import {
  _clearAllOrders,
  getOrder,
  listOrders,
  saveOrder,
  toStoredOrder,
  updateOrder,
  type SaveOrderInput,
} from '@/lib/orders/order-store'
import { MAX_ORDERS_PER_WALLET } from '@/lib/orders/types'

const WALLET = 'GAWALLETONE'
const OTHER_WALLET = 'GAWALLETTWO'

function makeOrder(overrides: Partial<SaveOrderInput> = {}): SaveOrderInput {
  return {
    id: 'order-1',
    walletAddress: WALLET,
    kind: 'onramp',
    status: 'created',
    payload: { id: 'order-1', amount: 50000, status: 'created' },
    ...overrides,
  }
}

beforeEach(() => {
  _clearAllOrders()
})

describe('saveOrder', () => {
  it('persists an order and returns it', () => {
    const record = saveOrder(makeOrder())

    expect(record).not.toBeNull()
    expect(record!.id).toBe('order-1')
    expect(record!.walletAddress).toBe(WALLET)
    expect(record!.payload).toEqual({ id: 'order-1', amount: 50000, status: 'created' })
  })

  it('is idempotent for the owning wallet and preserves createdAt', () => {
    const first = saveOrder(makeOrder())!
    const second = saveOrder(makeOrder({ status: 'payment_received' }))!

    expect(second.createdAt).toEqual(first.createdAt)
    expect(second.status).toBe('payment_received')
    expect(listOrders(WALLET)).toHaveLength(1)
  })

  it('refuses to overwrite an order owned by a different wallet', () => {
    saveOrder(makeOrder())

    expect(saveOrder(makeOrder({ walletAddress: OTHER_WALLET }))).toBeNull()
    expect(getOrder('order-1', WALLET)!.walletAddress).toBe(WALLET)
  })

  it('prunes the oldest orders beyond the per-wallet cap', () => {
    for (let i = 0; i < MAX_ORDERS_PER_WALLET + 5; i++) {
      saveOrder(makeOrder({ id: `order-${i}` }))
    }

    expect(getOrder('order-0', WALLET)).toBeNull()
    expect(getOrder('order-4', WALLET)).toBeNull()
    expect(getOrder('order-5', WALLET)).not.toBeNull()
    expect(listOrders(WALLET, { limit: 500 })).toHaveLength(MAX_ORDERS_PER_WALLET)
  })
})

describe('getOrder', () => {
  it('returns null for an unknown id', () => {
    expect(getOrder('missing', WALLET)).toBeNull()
  })

  it('does not leak an order to a different wallet', () => {
    saveOrder(makeOrder())

    expect(getOrder('order-1', OTHER_WALLET)).toBeNull()
  })
})

describe('listOrders', () => {
  it('returns the wallet orders newest first', () => {
    saveOrder(makeOrder({ id: 'order-1' }))
    saveOrder(makeOrder({ id: 'order-2' }))
    saveOrder(makeOrder({ id: 'order-3' }))

    expect(listOrders(WALLET).map((o) => o.id)).toEqual(['order-3', 'order-2', 'order-1'])
  })

  it('filters by kind', () => {
    saveOrder(makeOrder({ id: 'on-1', kind: 'onramp' }))
    saveOrder(makeOrder({ id: 'off-1', kind: 'offramp', status: 'pending_bank_details' }))

    expect(listOrders(WALLET, { kind: 'offramp' }).map((o) => o.id)).toEqual(['off-1'])
  })

  it('honours the limit', () => {
    saveOrder(makeOrder({ id: 'order-1' }))
    saveOrder(makeOrder({ id: 'order-2' }))

    expect(listOrders(WALLET, { limit: 1 }).map((o) => o.id)).toEqual(['order-2'])
  })

  it('returns an empty array for a wallet with no orders', () => {
    expect(listOrders(OTHER_WALLET)).toEqual([])
  })
})

describe('updateOrder', () => {
  it('merges the payload rather than replacing it', () => {
    saveOrder(makeOrder())

    const updated = updateOrder('order-1', WALLET, {
      status: 'completed',
      payload: { status: 'completed', transactionHash: '0xabc' },
    })!

    expect(updated.status).toBe('completed')
    expect(updated.payload).toEqual({
      id: 'order-1',
      amount: 50000,
      status: 'completed',
      transactionHash: '0xabc',
    })
  })

  it('leaves the payload untouched when only the status changes', () => {
    saveOrder(makeOrder())

    const updated = updateOrder('order-1', WALLET, { status: 'minting' })!

    expect(updated.status).toBe('minting')
    expect(updated.payload).toEqual({ id: 'order-1', amount: 50000, status: 'created' })
  })

  it('returns null for another wallet', () => {
    saveOrder(makeOrder())

    expect(updateOrder('order-1', OTHER_WALLET, { status: 'completed' })).toBeNull()
    expect(getOrder('order-1', WALLET)!.status).toBe('created')
  })

  it('returns null for an unknown id', () => {
    expect(updateOrder('missing', WALLET, { status: 'completed' })).toBeNull()
  })
})

describe('toStoredOrder', () => {
  it('serialises timestamps to ISO strings', () => {
    const record = saveOrder(makeOrder())!
    const stored = toStoredOrder(record)

    expect(stored.createdAt).toBe(record.createdAt.toISOString())
    expect(stored.updatedAt).toBe(record.updatedAt.toISOString())
    expect(stored.payload).toEqual(record.payload)
  })
})
