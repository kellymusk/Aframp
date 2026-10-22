import { GET } from '../route'

describe('GET /api/banks', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it('proxies banks successfully with 200 when Paystack succeeds', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_12345'
    const mockBanks = [
      { id: 1, name: 'Access Bank', code: '044' },
      { id: 2, name: 'Kuda Bank', code: '50211' },
    ]

    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true, message: 'Banks retrieved', data: mockBanks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.status).toBe(true)
    expect(body.data).toEqual(mockBanks)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/bank?country=nigeria',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_12345',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('works when PAYSTACK_SECRET_KEY is not set', async () => {
    delete process.env.PAYSTACK_SECRET_KEY

    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const response = await GET()
    expect(response.status).toBe(200)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/bank?country=nigeria',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
  })

  // #1025: an upstream failure must not leave the cash-out form without banks.
  it('serves a fallback bank list when Paystack returns a non-ok response', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: false, message: 'Bad Gateway' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(['cache', 'fallback']).toContain(body.source)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
  })

  it('serves a fallback bank list when fetch throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(['cache', 'fallback']).toContain(body.source)
    expect(body.data.length).toBeGreaterThan(0)
  })
})
