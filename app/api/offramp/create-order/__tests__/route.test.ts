import { POST } from '@/app/api/offramp/create-order/route'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

function makeRequest(body: unknown): Request {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request
}

function makeInvalidRequest(): Request {
  return {
    json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
  } as unknown as Request
}

describe('POST /api/offramp/create-order', () => {
  it('returns success:true with an order on valid input', async () => {
    const orderData = {
      assetId: 'cngn-stellar',
      asset: 'cNGN',
      chain: 'Stellar',
      amount: 100,
      fiatCurrency: 'NGN',
      rate: 1600,
      fiatAmount: 160000,
      fees: { offrampFee: 1600, networkFee: 15, bankFee: 0, totalFees: 1615, receiveAmount: 158385 },
    }

    const req = makeRequest(orderData)
    const responsePromise = POST(req)
    // Advance through the 800ms delay
    jest.runAllTimers()
    const response = await responsePromise
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Offramp order created successfully')
  })

  it('returns an order with status pending_bank_details', async () => {
    const req = makeRequest({ assetId: 'cngn-stellar', amount: 50 })
    const responsePromise = POST(req)
    jest.runAllTimers()
    const response = await responsePromise
    const body = await response.json()

    expect(body.order.status).toBe('pending_bank_details')
  })

  it('order id starts with offramp-', async () => {
    const req = makeRequest({ assetId: 'cngn-stellar', amount: 50 })
    const responsePromise = POST(req)
    jest.runAllTimers()
    const response = await responsePromise
    const body = await response.json()

    expect(body.order.id).toMatch(/^offramp-/)
  })

  it('order has createdAt and lockExpiresAt timestamps', async () => {
    const now = Date.now()
    const req = makeRequest({ assetId: 'cngn-stellar', amount: 50 })
    const responsePromise = POST(req)
    jest.runAllTimers()
    const response = await responsePromise
    const body = await response.json()

    expect(body.order.createdAt).toBeGreaterThanOrEqual(now)
    // lockExpiresAt = createdAt + 15 minutes
    expect(body.order.lockExpiresAt - body.order.createdAt).toBe(15 * 60 * 1000)
  })

  it('spreads the input orderData onto the returned order', async () => {
    const orderData = { assetId: 'usdc-stellar', amount: 200, fiatCurrency: 'NGN' }
    const req = makeRequest(orderData)
    const responsePromise = POST(req)
    jest.runAllTimers()
    const response = await responsePromise
    const body = await response.json()

    expect(body.order.assetId).toBe('usdc-stellar')
    expect(body.order.amount).toBe(200)
    expect(body.order.fiatCurrency).toBe('NGN')
  })

  it('returns 500 when request.json() throws', async () => {
    const req = makeInvalidRequest()
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Failed to create offramp order')
  })
})
