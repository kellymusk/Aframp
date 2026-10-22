import {
  ApiError,
  api,
  isOffline,
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
      fee_stroops: bigint
      network_fee_stroops: bigint
      total_stroops: bigint
    }>(
      '{"amount_stroops":1,"available":2,"pending":3,"fee_stroops":9007199254740993,"network_fee_stroops":5,"total_stroops":6}'
    )
    expect(parsed).toEqual({
      amount_stroops: 1n,
      available: 2n,
      pending: 3n,
      fee_stroops: 9007199254740993n,
      network_fee_stroops: 5n,
      total_stroops: 6n,
    })
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

describe('isOffline', () => {
  it('returns true for ApiError with status 0', () => {
    expect(isOffline(new ApiError('network failed', 0))).toBe(true)
  })

  it('returns false for other status codes or error types', () => {
    expect(isOffline(new ApiError('bad request', 400))).toBe(false)
    expect(isOffline(new Error('general error'))).toBe(false)
    expect(isOffline(null)).toBe(false)
    expect(isOffline('string')).toBe(false)
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
    expect(url).toBe('/backend/withdraw')
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
      message: "We can't reach the server right now. Check your connection and try again.",
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
  it('signup posts credentials and a phone number, and never gets a session back', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ challenge_id: 'chal-1', expires_in_secs: 600 }))
    const result = await api.signup('a@b.c', 'pw', 'Name', '08011122233')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/signup')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(
      '{"email":"a@b.c","password":"pw","name":"Name","phone_number":"08011122233"}'
    )
    expect(result).toEqual({ challenge_id: 'chal-1', expires_in_secs: 600 })
  })

  it('login posts credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 't', user_id: 'u', merchant_id: null }))
    await api.login('a@b.c', 'pw')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/login')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('verifyOtp posts the challenge id and code, not an email', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 't', user_id: 'u', merchant_id: 'm' }))
    await api.verifyOtp('chal-1', '482913')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/verify-otp')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"challenge_id":"chal-1","code":"482913"}')
  })

  it('logout posts to /logout with the token', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await api.logout('tok')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/logout')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' })
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
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/me')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('getWallet GETs /wallet', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.getWallet('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/wallet')
  })

  it('getWallet forwards AbortSignal so in-flight requests can be cancelled', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    fetchMock.mockRejectedValue(abortError)
    await expect(api.getWallet('tok', controller.signal)).rejects.toBe(abortError)
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('createWallet posts an empty body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createWallet('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/wallet/create')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].body).toBe('{}')
  })

  it('createWallet forwards AbortSignal so in-flight requests can be cancelled', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    fetchMock.mockRejectedValue(abortError)
    await expect(api.createWallet('tok', controller.signal)).rejects.toBe(abortError)
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('getBalances GETs /balance', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.getBalances('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/balance')
  })

  it('listTransactions builds the limit query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listTransactions('tok', 20)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/transactions?limit=20')
  })

  it('createPaymentRequest posts amount_stroops', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createPaymentRequest('tok', 5n)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/payment-requests')
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
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/payment-requests?limit=50')
  })

  it('getPaymentRequest fetches without a token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.getPaymentRequest('abc')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/payment-requests/abc')
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
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/withdrawals?limit=50')
  })

  it('createRefund posts refund request with body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createRefund('tok', 'pay-1', 100n, 'GDEST123', 'Customer request')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/payments/pay-1/refund')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok',
    })
    expect(init.body).toBe(
      '{"amount_stroops":100,"recipient":"GDEST123","reason":"Customer request"}'
    )
  })

  it('listRefunds GETs /refunds with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listRefunds('tok', 25)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/refunds?limit=25')
  })

  it('listApiKeys GETs /api-keys', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listApiKeys('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/api-keys')
  })

  it('createApiKey posts name to /api-keys', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createApiKey('tok', 'My Key')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/api-keys')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"My Key"}')
  })

  it('createApiKey sends scopes and expiry when given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createApiKey('tok', 'Reporting', {
      scopes: ['read'],
      expiresAt: '2027-01-01T00:00:00.000Z',
    })
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({
      name: 'Reporting',
      scopes: ['read'],
      expires_at: '2027-01-01T00:00:00.000Z',
    })
  })

  it('revokeApiKey sends DELETE to /api-keys/:id', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await api.revokeApiKey('tok', 'key-uuid-1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/api-keys/key-uuid-1')
    expect(init.method).toBe('DELETE')
  })

  it('updateProfile posts to /me', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.updateProfile('tok', { name: 'Alice', merchant_name: 'Alice Store' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/me')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"Alice","merchant_name":"Alice Store"}')
  })

  it('changeEmail posts new_email to /me/email', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'verification sent' }))
    await api.changeEmail('tok', 'new@example.com')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/me/email')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"new_email":"new@example.com"}')
  })

  it('deleteAccount sends DELETE to /me', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'account deleted' }))
    await api.deleteAccount('tok')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/me')
    expect(init.method).toBe('DELETE')
  })

  it('registerPushSubscription posts subscription to /push/subscribe', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.registerPushSubscription('tok', {
      endpoint: 'https://push.example.com',
      p256dh: 'p256',
      auth: 'authKey',
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/push/subscribe')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(
      '{"endpoint":"https://push.example.com","p256dh":"p256","auth":"authKey"}'
    )
  })

  it('unregisterPushSubscription sends DELETE to /push/unsubscribe', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await api.unregisterPushSubscription('tok')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/push/unsubscribe')
    expect(init.method).toBe('DELETE')
  })

  it('getPushSubscriptionStatus GETs /push/status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ enabled: true }))
    const res = await api.getPushSubscriptionStatus('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/push/status')
    expect(res).toEqual({ enabled: true })
  })

  it('getRemittanceFeeEstimate GETs /remittance/estimate with query params', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ fee_stroops: 10, network_fee_stroops: 1, total_stroops: 11 })
    )
    await api.getRemittanceFeeEstimate('tok', 500n, 'XLM')
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/backend/remittance/estimate?amount_stroops=500&asset=XLM'
    )
  })

  it('createRemittance posts to /remittance', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createRemittance('tok', 'GDEST123', 500n, 'XLM', 'Invoice #12')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/remittance')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(
      '{"destination_address":"GDEST123","amount_stroops":500,"asset":"XLM","memo":"Invoice #12"}'
    )
  })

  it('listRemittances GETs /remittances with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listRemittances('tok', 30)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/remittances?limit=30')
  })

  it('createOzowPayment posts initiate details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ payment_url: 'https://ozow.test', transaction_id: 'tx-1' })
    )
    await api.createOzowPayment('tok', 150, 'ABSA', 'https://return.test')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/onramp/ozow/initiate')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"amount":150,"bank_code":"ABSA","return_url":"https://return.test"}')
  })

  it('verifyOzowPayment GETs /onramp/ozow/verify/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'completed' }))
    const res = await api.verifyOzowPayment('tok', 'tx-1')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/onramp/ozow/verify/tx-1')
    expect(res).toEqual({ status: 'completed' })
  })

  it('adminOverview GETs /admin/overview', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total_users: 10 }))
    await api.adminOverview('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/overview')
  })

  it('adminUsers GETs /admin/users with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.adminUsers('tok', 50)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/users?limit=50')
  })

  it('adminMerchants GETs /admin/merchants with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.adminMerchants('tok', 50)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/merchants?limit=50')
  })

  it('adminWallets GETs /admin/wallets with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.adminWallets('tok', 50)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/wallets?limit=50')
  })

  it('adminTransactions GETs /admin/transactions with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.adminTransactions('tok', 50)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/transactions?limit=50')
  })

  it('adminWithdrawals GETs /admin/withdrawals with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.adminWithdrawals('tok', 50)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/withdrawals?limit=50')
  })

  it('adminPaymentRequests GETs /admin/payment-requests with limit', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.adminPaymentRequests('tok', 50)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/payment-requests?limit=50')
  })
})
