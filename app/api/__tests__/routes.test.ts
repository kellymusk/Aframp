/**
 * Tests for API route handlers
 *
 * Covers:
 *  - GET /api/exchange-rate   — CoinGecko fetch, caching, error handling
 *  - POST /api/onramp/create-order — order creation, field population
 *  - POST /api/withdrawals    — KYC tier limit enforcement, validation
 *  - GET/POST /api/referral   — code generation, discount application
 *  - POST /api/bills/initiate — Paystack integration, validation
 */

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()

jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}))

// ---------------------------------------------------------------------------
// exchange-rate
// ---------------------------------------------------------------------------

describe('GET /api/exchange-rate', () => {
  const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'

  beforeEach(() => {
    jest.resetModules()
    mockRedisGet.mockReset().mockResolvedValue(null)
    mockRedisSet.mockReset().mockResolvedValue('OK')
  })

  it('returns 200 with rate data from CoinGecko', async () => {
    const mockData = {
      'usd-coin': { ngn: 1600, kes: 130 },
      stellar: { ngn: 160, kes: 13 },
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })

    const { GET } = await import('@/app/api/exchange-rate/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockData)
    expect(response.headers.get('X-Cache')).toBe('MISS')
    expect(mockRedisSet).toHaveBeenCalledWith('exchange-rates', mockData, { ex: 60 })
  })

  it('returns cached rates without calling CoinGecko', async () => {
    const cached = {
      'usd-coin': { ngn: 1600, kes: 130 },
      stellar: { ngn: 160, kes: 13 },
    }
    mockRedisGet.mockResolvedValue(cached)
    global.fetch = jest.fn()

    const { GET } = await import('@/app/api/exchange-rate/route')
    const response = await GET()

    expect(await response.json()).toEqual(cached)
    expect(response.headers.get('X-Cache')).toBe('HIT')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns error status when CoinGecko responds with non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    })

    const { GET } = await import('@/app/api/exchange-rate/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toBe('Failed to fetch rates')
  })

  it('returns 500 when fetch throws an exception', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const { GET } = await import('@/app/api/exchange-rate/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Unable to fetch exchange rates')
  })

  it('calls CoinGecko with the correct URL including ngn,kes,ghs,zar,ugx currencies', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })

    const { GET } = await import('@/app/api/exchange-rate/route')
    await GET()

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('coingecko.com')
    expect(calledUrl).toContain('ngn')
    expect(calledUrl).toContain('kes')
    expect(calledUrl).toContain('ghs')
    expect(calledUrl).toContain('zar')
    expect(calledUrl).toContain('ugx')
  })

  it('fetches fresh rates when Redis is unavailable', async () => {
    const mockData = {
      'usd-coin': { ngn: 1600 },
      stellar: { ngn: 160 },
    }
    mockRedisGet.mockRejectedValue(new Error('Redis unavailable'))
    mockRedisSet.mockRejectedValue(new Error('Redis unavailable'))
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })

    const { GET } = await import('@/app/api/exchange-rate/route')
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(mockData)
    expect(response.headers.get('X-Cache')).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// rates
// ---------------------------------------------------------------------------

describe('GET /api/rates', () => {
  beforeEach(() => {
    jest.resetModules()
    mockRedisGet.mockReset().mockResolvedValue(null)
    mockRedisSet.mockReset().mockResolvedValue('OK')
  })

  it('returns a cached Ethereum rate without calling CoinGecko', async () => {
    const cached = { ethereum: { usd: 3500 } }
    mockRedisGet.mockResolvedValue(cached)
    global.fetch = jest.fn()

    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()

    expect(await response.json()).toEqual(cached)
    expect(response.headers.get('X-Cache')).toBe('HIT')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('caches a fresh Ethereum rate for 60 seconds', async () => {
    const fresh = { ethereum: { usd: 3500 } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(fresh),
    })

    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()

    expect(await response.json()).toEqual(fresh)
    expect(response.headers.get('X-Cache')).toBe('MISS')
    expect(mockRedisSet).toHaveBeenCalledWith('exchange-rates:ethereum-usd', fresh, {
      ex: 60,
    })
  })

  it('returns the upstream error when no cached rate is available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    })

    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'CoinGecko responded 429' })
  })

  it('returns fresh rates when the Redis write fails', async () => {
    const fresh = { ethereum: { usd: 3500 } }
    mockRedisSet.mockRejectedValue(new Error('Redis unavailable'))
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(fresh),
    })

    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(fresh)
    expect(response.headers.get('X-Cache')).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// create-order
// ---------------------------------------------------------------------------

describe('POST /api/onramp/create-order', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns 200 with created order on valid request', async () => {
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'))

    const { POST } = await import('@/app/api/onramp/create-order/route')

    const orderData = {
      orderId: 'ORD-001',
      userId: 'GABC123',
      amount: 10000,
      currency: 'NGN',
      asset: 'cNGN',
    }

    const request = new Request('http://localhost/api/onramp/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    })

    // Advance timers so the 800ms simulated delay resolves
    const responsePromise = POST(request)
    jest.advanceTimersByTime(1000)
    const response = await responsePromise

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order.status).toBe('created')
    expect(data.order.orderId).toBe('ORD-001')
  })

  it('sets createdAt and expiresAt on the created order', async () => {
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'))
    const now = Date.now()

    const { POST } = await import('@/app/api/onramp/create-order/route')

    const request = new Request('http://localhost/api/onramp/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'ORD-002', amount: 5000, currency: 'KES' }),
    })

    const responsePromise = POST(request)
    jest.advanceTimersByTime(1000)
    const response = await responsePromise

    const data = await response.json()

    expect(data.order.createdAt).toBe(now)
    // expiresAt = createdAt + 15 minutes
    expect(data.order.expiresAt).toBe(now + 15 * 60 * 1000)
  })

  it('returns 500 when request body is invalid JSON', async () => {
    const { POST } = await import('@/app/api/onramp/create-order/route')

    const request = new Request('http://localhost/api/onramp/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{{{',
    })

    const responsePromise = POST(request)
    jest.advanceTimersByTime(1000)
    const response = await responsePromise

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('includes the message "Order created successfully"', async () => {
    const { POST } = await import('@/app/api/onramp/create-order/route')

    const request = new Request('http://localhost/api/onramp/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'ORD-003' }),
    })

    const responsePromise = POST(request)
    jest.advanceTimersByTime(1000)
    const response = await responsePromise

    const data = await response.json()
    expect(data.message).toBe('Order created successfully')
  })
})

// ---------------------------------------------------------------------------
// withdrawals
// ---------------------------------------------------------------------------

describe('POST /api/withdrawals', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns 200 with orderId when TIER_1 user is within daily limit', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    const request = new Request('http://localhost/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: `user_${Date.now()}_${Math.random()}`,
        amountCents: 100_00, // $100
        asset: 'cNGN',
        chain: 'Stellar',
        kycTier: 'TIER_1',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.orderId).toMatch(/^OFF-/)
    expect(data.status).toBe('pending')
    expect(data.asset).toBe('cNGN')
  })

  it('returns 403 when TIER_0 user attempts a withdrawal', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    const request = new Request('http://localhost/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: `tier0_${Date.now()}`,
        amountCents: 1,
        asset: 'cNGN',
        chain: 'Stellar',
        kycTier: 'TIER_0',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
  })

  it('returns 403 when TIER_1 user exceeds the $1,000 daily limit', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    // Use a unique userId so it is not affected by other tests
    const userId = `tier1_exceed_${Date.now()}_${Math.random()}`

    // Seed state via first request that fills the limit
    await POST(
      new Request('http://localhost/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amountCents: 1_000_00,
          asset: 'cNGN',
          chain: 'Stellar',
          kycTier: 'TIER_1',
        }),
      })
    )

    // Second request should be rejected
    const response = await POST(
      new Request('http://localhost/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amountCents: 1_00,
          asset: 'cNGN',
          chain: 'Stellar',
          kycTier: 'TIER_1',
        }),
      })
    )

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
  })

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    const request = new Request('http://localhost/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid JSON body')
  })

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    const request = new Request('http://localhost/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123' }), // missing amountCents, asset, chain, kycTier
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid request')
  })

  it('returns 400 for invalid kycTier value', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    const request = new Request('http://localhost/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user123',
        amountCents: 100,
        asset: 'cNGN',
        chain: 'Stellar',
        kycTier: 'INVALID_TIER',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('TIER_3 user is always allowed regardless of amount', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    const request = new Request('http://localhost/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: `tier3_${Date.now()}`,
        amountCents: 99_999_99,
        asset: 'USDC',
        chain: 'Stellar',
        kycTier: 'TIER_3',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('response includes remaining and resetAt fields', async () => {
    const { POST } = await import('@/app/api/withdrawals/route')

    const response = await POST(
      new Request('http://localhost/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `fields_${Date.now()}`,
          amountCents: 5_000,
          asset: 'cNGN',
          chain: 'Stellar',
          kycTier: 'TIER_1',
        }),
      })
    )

    const data = await response.json()
    expect(response.status).toBe(200)
    expect('remaining' in data).toBe(true)
    expect('resetAt' in data).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// referral
// ---------------------------------------------------------------------------

describe('GET /api/referral', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns 400 when wallet param is missing', async () => {
    const { GET } = await import('@/app/api/referral/route')
    const request = new Request('http://localhost/api/referral')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('wallet required')
  })

  it('returns a referral record with code, ownerAddress, and referees', async () => {
    const { GET } = await import('@/app/api/referral/route')
    const wallet = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE6'
    const request = new Request(`http://localhost/api/referral?wallet=${wallet}`)
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.code).toBeTruthy()
    expect(data.ownerAddress).toBe(wallet)
    expect(Array.isArray(data.referees)).toBe(true)
    expect(typeof data.totalRebatesEarned).toBe('number')
    expect(typeof data.createdAt).toBe('number')
  })

  it('returns the same code on repeated calls for the same wallet', async () => {
    const { GET } = await import('@/app/api/referral/route')
    const wallet = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE6'
    const req1 = new Request(`http://localhost/api/referral?wallet=${wallet}`)
    const req2 = new Request(`http://localhost/api/referral?wallet=${wallet}`)

    const r1 = await (await GET(req1)).json()
    const r2 = await (await GET(req2)).json()

    expect(r1.code).toBe(r2.code)
  })

  it('referral code starts with AFR-', async () => {
    const { GET } = await import('@/app/api/referral/route')
    const wallet = 'GBPXEZPKDQMTQPXHDKVMPJF5GGMEXNWRDANL7HZNFMLFK2AEY5MLJK2'
    const request = new Request(`http://localhost/api/referral?wallet=${wallet}`)
    const response = await GET(request)
    const data = await response.json()

    expect(data.code).toMatch(/^AFR-/)
  })
})

describe('POST /api/referral', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns 400 when code or refereeWallet is missing', async () => {
    const { POST } = await import('@/app/api/referral/route')

    const request = new Request('http://localhost/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'AFR-TEST-1234' }), // missing refereeWallet
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('code and refereeWallet required')
  })

  it('returns 404 for an unknown referral code', async () => {
    const { POST } = await import('@/app/api/referral/route')

    const response = await POST(
      new Request('http://localhost/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'AFR-XXXX-9999', refereeWallet: 'GNEWWALLET' }),
      })
    )

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Invalid referral code')
  })

  it('returns 400 when the owner tries to use their own code', async () => {
    // First create the code via GET
    const ownerWallet = 'GSELFUSE_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

    const { GET, POST } = await import('@/app/api/referral/route')
    const getResponse = await GET(
      new Request(`http://localhost/api/referral?wallet=${ownerWallet}`)
    )
    const { code } = await getResponse.json()

    const postResponse = await POST(
      new Request('http://localhost/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, refereeWallet: ownerWallet }),
      })
    )

    expect(postResponse.status).toBe(400)
    const data = await postResponse.json()
    expect(data.error).toBe('Cannot use your own referral code')
  })

  it('returns 200 with discountPct when a valid code is applied', async () => {
    const ownerWallet = 'GOWNER_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    const refereeWallet = 'GREFEREE_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'

    const { GET, POST } = await import('@/app/api/referral/route')
    const getResponse = await GET(
      new Request(`http://localhost/api/referral?wallet=${ownerWallet}`)
    )
    const { code } = await getResponse.json()

    const postResponse = await POST(
      new Request('http://localhost/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, refereeWallet }),
      })
    )

    expect(postResponse.status).toBe(200)
    const data = await postResponse.json()
    expect(data.success).toBe(true)
    expect(data.discountPct).toBe(10)
  })

  it('returns 409 when the same wallet tries to use the code twice', async () => {
    const ownerWallet = 'GOWNER_DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'
    const refereeWallet = 'GREFEREE_EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'

    const { GET, POST } = await import('@/app/api/referral/route')
    const getResponse = await GET(
      new Request(`http://localhost/api/referral?wallet=${ownerWallet}`)
    )
    const { code } = await getResponse.json()

    // First use — should succeed
    await POST(
      new Request('http://localhost/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, refereeWallet }),
      })
    )

    // Second use — should be rejected
    const secondResponse = await POST(
      new Request('http://localhost/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, refereeWallet }),
      })
    )

    expect(secondResponse.status).toBe(409)
    const data = await secondResponse.json()
    expect(data.error).toBe('Code already used by this wallet')
  })
})

// ---------------------------------------------------------------------------
// bills/initiate
// ---------------------------------------------------------------------------

describe('POST /api/bills/initiate', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('@/app/api/bills/initiate/route')

    const request = new Request('http://localhost/api/bills/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billerId: 'DSTV',
        // missing accountNumber, amount, customerEmail
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 200 with authorization_url and reference on success', async () => {
    // Mock the Paystack API call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            authorization_url: 'https://paystack.com/pay/test-ref',
            reference: 'TEST-REF-001',
          },
        }),
    })

    const { POST } = await import('@/app/api/bills/initiate/route')

    const request = new Request('http://localhost/api/bills/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billerId: 'DSTV',
        billerName: 'DSTV Subscription',
        accountNumber: '1234567890',
        amount: 5000,
        customerEmail: 'user@example.com',
        customerPhone: '+2348012345678',
        paymentMethod: 'card',
        gateway: 'paystack',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.authorization_url).toBeTruthy()
    expect(data.reference).toBeTruthy()
  })

  it('generates a unique BILL- reference for each request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: { authorization_url: 'https://paystack.com/pay/ref', reference: 'paystack-ref' },
        }),
    })

    const { POST } = await import('@/app/api/bills/initiate/route')

    const makeRequest = () =>
      POST(
        new Request('http://localhost/api/bills/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billerId: 'ELECTRICITY',
            billerName: 'NEPA',
            accountNumber: '9876543210',
            amount: 2000,
            customerEmail: 'power@example.com',
          }),
        })
      )

    const [r1, r2] = await Promise.all([makeRequest(), makeRequest()])
    const [d1, d2] = await Promise.all([r1.json(), r2.json()])

    // References should be unique
    expect(d1.reference).not.toBe(d2.reference)
  })

  it('reference starts with BILL-', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: { authorization_url: 'https://paystack.com/pay/ref', reference: 'paystack-ref' },
        }),
    })

    const { POST } = await import('@/app/api/bills/initiate/route')

    const response = await POST(
      new Request('http://localhost/api/bills/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billerId: 'CABLE',
          billerName: 'StarTimes',
          accountNumber: '111222333',
          amount: 3000,
          customerEmail: 'tv@example.com',
        }),
      })
    )

    const data = await response.json()
    expect(data.reference).toMatch(/^BILL-/)
  })

  it('returns 500 when Paystack API throws an error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Paystack unavailable'))

    const { POST } = await import('@/app/api/bills/initiate/route')

    const response = await POST(
      new Request('http://localhost/api/bills/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billerId: 'DSTV',
          billerName: 'DSTV',
          accountNumber: '1234567890',
          amount: 5000,
          customerEmail: 'user@example.com',
        }),
      })
    )

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to initiate payment')
  })

  it('passes metadata including billerId, billerName, and accountNumber to the gateway', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: { authorization_url: 'https://paystack.com/pay/ref', reference: 'ref-001' },
        }),
    })
    global.fetch = mockFetch

    const { POST } = await import('@/app/api/bills/initiate/route')

    await POST(
      new Request('http://localhost/api/bills/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billerId: 'GOTV',
          billerName: 'GOtv Subscription',
          accountNumber: '5551234567',
          amount: 1500,
          customerEmail: 'gotv@example.com',
        }),
      })
    )

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body)
    expect(body.metadata.billerId).toBe('GOTV')
    expect(body.metadata.billerName).toBe('GOtv Subscription')
    expect(body.metadata.accountNumber).toBe('5551234567')
  })
})
