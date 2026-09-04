import {
  ApiError,
  api,
  parseWithBigInts,
  request,
  setUnauthorizedHandler,
  stringifyWithBigInts,
} from '@/lib/api'

const fetchMock = jest.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  setUnauthorizedHandler(null)
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('parseWithBigInts', () => {
  it('revives bigint wire values past 2^53 without rounding', () => {
    const parsed = parseWithBigInts<{ amount_stroops: bigint }>(
      '{"amount_stroops":9007199254740993}'
    )
    expect(parsed.amount_stroops).toBe(9007199254740993n)
  })

  it('revives negative amounts', () => {
    const parsed = parseWithBigInts<{ available: bigint }>('{"available":-42}')
    expect(parsed.available).toBe(-42n)
  })

  it('revives every bigint key at once', () => {
    const parsed = parseWithBigInts<{
      amount_stroops: bigint
      available: bigint
      pending: bigint
    }>('{"amount_stroops":1,"available":2,"pending":3}')
    expect(parsed).toEqual({ amount_stroops: 1n, available: 2n, pending: 3n })
  })

  it('leaves non-bigint keys and string values untouched', () => {
    const parsed = parseWithBigInts<{ asset: string; status: string; note: string }>(
      '{"asset":"cNGN","status":"pending","note":"amount_stroops: 123"}'
    )
    expect(parsed).toEqual({ asset: 'cNGN', status: 'pending', note: 'amount_stroops: 123' })
  })
})

describe('stringifyWithBigInts', () => {
  it('emits bigints as unquoted JSON integers', () => {
    expect(stringifyWithBigInts({ amount_stroops: 9007199254740993n })).toBe(
      '{"amount_stroops":9007199254740993}'
    )
  })

  it('handles negative bigints', () => {
    expect(stringifyWithBigInts({ available: -7n })).toBe('{"available":-7}')
  })

  it('round-trips values above 2^53 without rounding', () => {
    const value = { amount_stroops: 9007199254740993n, available: -123n, pending: 0n }
    expect(parseWithBigInts<typeof value>(stringifyWithBigInts(value))).toEqual(value)
  })

  it('leaves plain JSON alone', () => {
    expect(stringifyWithBigInts({ asset: 'cNGN', n: 42 })).toBe('{"asset":"cNGN","n":42}')
  })
})

describe('ApiError', () => {
  it('exposes name, message and status', () => {
    const error = new ApiError('boom', 500)
    expect(error.name).toBe('ApiError')
    expect(error.message).toBe('boom')
    expect(error.status).toBe(500)
  })
})

describe('request', () => {
  it('parses a JSON success body and revives bigints', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"amount_stroops":9007199254740993}', { status: 200 })
    )
    const result = await request<{ amount_stroops: bigint }>('/balance')
    expect(result.amount_stroops).toBe(9007199254740993n)
  })

  it('returns undefined for an empty 200 body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    await expect(request('/wallet')).resolves.toBeUndefined()
  })

  it('serializes bigint request bodies without rounding', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    await request('/withdraw', { method: 'POST', body: { amount_stroops: 9007199254740993n } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:3000/withdraw')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"amount_stroops":9007199254740993}')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('attaches Authorization only when a token is present', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    await request('/me', { token: 'tok' })
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('calls onUnauthorized on 401 when a token was sent', async () => {
    const onUnauthorized = jest.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(new Response('{"error":"expired"}', { status: 401 }))
    await expect(request('/me', { token: 'tok' })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not call onUnauthorized on 401 without a token', async () => {
    const onUnauthorized = jest.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(new Response('{"error":"bad password"}', { status: 401 }))
    await expect(request('/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 401,
    })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('uses the error field from a JSON error body', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"Insufficient balance"}', { status: 400 }))
    await expect(request('/withdraw', { method: 'POST' })).rejects.toMatchObject({
      message: 'Insufficient balance',
      status: 400,
    })
  })

  it('falls back to a status-code message for a non-JSON error body', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))
    await expect(request('/balance')).rejects.toMatchObject({
      message: 'Request failed (502)',
      status: 502,
    })
  })

  it('throws ApiError(status 0) on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(request('/balance')).rejects.toMatchObject({
      message: "Can't reach the payment server at http://127.0.0.1:3000.",
      status: 0,
    })
  })

  it('rethrows AbortError unchanged', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    fetchMock.mockRejectedValue(abortError)
    await expect(request('/balance', { signal: new AbortController().signal })).rejects.toBe(
      abortError
    )
  })
})

describe('api', () => {
  it('signup posts credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 't', user_id: 'u', merchant_id: null }))
    await api.signup('a@b.c', 'pw', 'Name')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:3000/signup')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"email":"a@b.c","password":"pw","name":"Name"}')
  })

  it('login posts credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 't', user_id: 'u', merchant_id: null }))
    await api.login('a@b.c', 'pw')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/login')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('getMe GETs /me with a token', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        user_id: 'u',
        email: 'e',
        name: 'n',
        created_at: '',
        merchant_id: null,
        merchant_name: null,
      })
    )
    await api.getMe('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/me')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('createWallet posts an empty body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createWallet('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/wallet/create')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].body).toBe('{}')
  })

  it('getWallet GETs /wallet', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.getWallet('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/wallet')
  })

  it('getBalances GETs /balance', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.getBalances('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/balance')
  })

  it('listTransactions builds the limit query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listTransactions('tok', 20)
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/transactions?limit=20')
  })

  it('createPaymentRequest posts amount_stroops', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createPaymentRequest('tok', 5n)
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/payment-requests')
    expect(fetchMock.mock.calls[0][1].body).toBe('{"amount_stroops":5}')
  })

  it('createPaymentRequest forwards optional asset and expiry', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createPaymentRequest('tok', 5n, 'cNGN', 3600)
    expect(fetchMock.mock.calls[0][1].body).toBe(
      '{"amount_stroops":5,"asset":"cNGN","expires_in_secs":3600}'
    )
  })

  it('listPaymentRequests builds the limit query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listPaymentRequests('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/payment-requests?limit=50')
  })

  it('getPaymentRequest fetches without a token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.getPaymentRequest('abc')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/payment-requests/abc')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({})
  })

  it('createWithdrawal posts bank details and defaults to cNGN', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createWithdrawal('tok', 5n, '044', '0123456789')
    expect(fetchMock.mock.calls[0][1].body).toBe(
      '{"amount_stroops":5,"asset":"cNGN","bank_code":"044","account_number":"0123456789"}'
    )
  })

  it('createWithdrawal forwards an explicit asset', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createWithdrawal('tok', 5n, 'MPS', '0700000000', 'cKES')
    expect(fetchMock.mock.calls[0][1].body).toBe(
      '{"amount_stroops":5,"asset":"cKES","bank_code":"MPS","account_number":"0700000000"}'
    )
  })

  it('listWithdrawals builds the limit query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listWithdrawals('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/withdrawals?limit=50')
  })
})
