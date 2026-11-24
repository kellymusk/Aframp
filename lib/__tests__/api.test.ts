import {
  ApiError,
  api,
  parseWithBigInts,
  request,
  setUnauthorizedHandler,
  stringifyWithBigInts,
} from '@/lib/api'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, clearCsrfToken, writeCsrfToken } from '@/lib/csrf'

const fetchMock = jest.fn()
const originalFetch = globalThis.fetch

/** The `X-CSRF-Token` header of a captured fetch call. */
function csrfHeader(index = 0): string | undefined {
  return fetchMock.mock.calls[index][1].headers[CSRF_HEADER_NAME]
}

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  setUnauthorizedHandler(null)
  clearCsrfToken()
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
    const parsed = parseWithBigInts<{ asset: string; status: string; note: string; marker: string }>(
      '{"asset":"cNGN","status":"pending","note":"amount_stroops: 123","marker":" bigint 9007199254740993 bigint "}'
    )
    expect(parsed).toEqual({
      asset: 'cNGN',
      status: 'pending',
      note: 'amount_stroops: 123',
      marker: ' bigint 9007199254740993 bigint ',
    })
  })

  it('revives tagged bigint objects without confusing strings', () => {
    const parsed = parseWithBigInts<{ amount: bigint; text: string }>(
      '{"amount":{"__bigint":"9007199254740993"},"text":"{\\"__bigint\\":\\"123\\"}"}'
    )
    expect(parsed).toEqual({
      amount: 9007199254740993n,
      text: '{"__bigint":"123"}',
    })
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

  it('does not collide with marker text inside strings', () => {
    const value = {
      amount_stroops: 9007199254740993n,
      memo: 'quoted bigint marker: bigint 9007199254740993 bigint ',
    }
    expect(parseWithBigInts<typeof value>(stringifyWithBigInts(value))).toEqual(value)
  })

  it('does not rewrite a string containing a bigint key pattern', () => {
    const value = {
      amount_stroops: 9007199254740993n,
      memo: 'The API quoted: "amount_stroops": 123',
    }
    expect(parseWithBigInts<typeof value>(stringifyWithBigInts(value))).toEqual(value)
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

  it.each([' \n\t', '<html>Not JSON</html>'])(
    'returns undefined for a 200 response with a non-JSON body (%j)',
    async (body) => {
      fetchMock.mockResolvedValue(new Response(body, { status: 200 }))
      await expect(request<void>('/logout')).resolves.toBeUndefined()
    }
  )

  it('serializes bigint request bodies without rounding', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    await request('/withdraw', { method: 'POST', body: { amount_stroops: 9007199254740993n } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/withdraw')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"amount_stroops":9007199254740993}')
    expect(init.headers['Content-Type']).toBe('application/json')
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

  it('leaves bigint-looking text in JSON error bodies unchanged', async () => {
    const memo = 'The API quoted: "amount_stroops": 123'
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: memo, code: 'quoted' }), { status: 400 })
    )
    await expect(request('/withdraw', { method: 'POST' })).rejects.toMatchObject({
      message: memo,
      code: 'quoted',
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
    expect(init.headers.Authorization).toBe('Bearer tok')
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

  it('createWallet posts an empty body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createWallet('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/wallet/create')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].body).toBe('{}')
  })

  it('getWallet GETs /wallet', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.getWallet('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/wallet')
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

  it('admin list methods request a server-side page of 25 by default', async () => {
    const calls = [
      [api.adminUsers, '/backend/admin/users'],
      [api.adminMerchants, '/backend/admin/merchants'],
      [api.adminWallets, '/backend/admin/wallets'],
      [api.adminTransactions, '/backend/admin/transactions'],
      [api.adminWithdrawals, '/backend/admin/withdrawals'],
      [api.adminPaymentRequests, '/backend/admin/payment-requests'],
    ] as const

    for (const [method, endpoint] of calls) {
      fetchMock.mockResolvedValueOnce(jsonResponse([]))
      await method('tok')
      expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(`${endpoint}?page=1&page_size=25`)
    }
  })

  it('admin list methods accept an explicit page and page size', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.adminUsers('tok', 3, 40)
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/admin/users?page=3&page_size=40')
  })

  it('getBalances GETs /balance', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.getBalances('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/balance')
  })

  it('listApiKeys GETs /api-keys', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listApiKeys('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/api-keys')
  })

  it('createApiKey posts the key name', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createApiKey('tok', 'CI key')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/api-keys')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"CI key"}')
  })

  it('updateProfile posts only the provided fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.updateProfile('tok', { name: 'New Name' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/me')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"New Name"}')
  })

  it('changeEmail posts the new address', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.changeEmail('tok', 'new@example.com')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/me/email')
    expect(fetchMock.mock.calls[0][1].body).toBe('{"new_email":"new@example.com"}')
  })

  it('createRefund posts the amount and recipient', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createRefund('tok', 'pay-1', 5n, 'GABC')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/payments/pay-1/refund')
    expect(init.body).toBe('{"amount_stroops":5,"recipient":"GABC"}')
  })

  it('createRefund forwards an optional reason', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createRefund('tok', 'pay-1', 5n, 'GABC', 'duplicate')
    expect(fetchMock.mock.calls[0][1].body).toBe(
      '{"amount_stroops":5,"recipient":"GABC","reason":"duplicate"}'
    )
  })

  it('listRefunds builds the limit query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listRefunds('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/refunds?limit=50')
  })

  it('listPaymentRequests builds the limit query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listPaymentRequests('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/payment-requests?limit=50')
  })

  it('getRemittanceFeeEstimate builds the estimate query', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.getRemittanceFeeEstimate('tok', 5n)
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/backend/remittance/estimate?amount_stroops=5&asset=XLM'
    )
  })

  it('createRemittance posts the destination and amount', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createRemittance('tok', 'GABC', 5n)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/remittance')
    expect(init.body).toBe('{"destination_address":"GABC","amount_stroops":5,"asset":"XLM"}')
  })

  it('createRemittance forwards an optional memo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createRemittance('tok', 'GABC', 5n, 'XLM', 'invoice 1')
    expect(fetchMock.mock.calls[0][1].body).toContain('"memo":"invoice 1"')
  })

  it('listRemittances builds the limit query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await api.listRemittances('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/remittances?limit=50')
  })

  it('createOzowPayment posts the amount, bank and return URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.createOzowPayment('tok', 250, 'FNB', 'https://app.aframp.com/charge')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/backend/onramp/ozow/initiate')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(
      '{"amount":250,"bank_code":"FNB","return_url":"https://app.aframp.com/charge"}'
    )
  })

  it('verifyOzowPayment GETs the transaction status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.verifyOzowPayment('tok', 'txn-1')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/onramp/ozow/verify/txn-1')
  })

  it('registerPushSubscription posts the subscription', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.registerPushSubscription('tok', {
      endpoint: 'https://push.example/1',
      p256dh: 'key',
      auth: 'auth',
    })
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/push/subscribe')
  })

  it('unregisterPushSubscription DELETEs the subscription', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.unregisterPushSubscription('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/push/unsubscribe')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('getPushSubscriptionStatus GETs the status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ enabled: true }))
    await api.getPushSubscriptionStatus('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('/backend/push/status')
  })

  it.each([
    ['adminOverview', '/backend/admin/overview'],
    ['adminUsers', '/backend/admin/users?limit=100'],
    ['adminMerchants', '/backend/admin/merchants?limit=100'],
    ['adminWallets', '/backend/admin/wallets?limit=100'],
    ['adminTransactions', '/backend/admin/transactions?limit=100'],
    ['adminWithdrawals', '/backend/admin/withdrawals?limit=100'],
    ['adminPaymentRequests', '/backend/admin/payment-requests?limit=100'],
  ])('%s GETs %s', async (method, url) => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await (api[method as 'adminOverview'] as (token: string) => Promise<unknown>)('tok')
    expect(fetchMock.mock.calls[0][0]).toBe(url)
  })
})

describe('CSRF token inclusion', () => {
  it('sends a token on a POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await request('/withdraw', { method: 'POST', body: {} })
    expect(csrfHeader()).toEqual(expect.any(String))
  })

  it('sends a token on a DELETE', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await request('/me', { method: 'DELETE' })
    expect(csrfHeader()).toEqual(expect.any(String))
  })

  it('omits the token on a GET, so it never leaks into a referrer or a log', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await request('/balance')
    expect(csrfHeader()).toBeUndefined()
  })

  it('echoes back exactly what the SameSite=Strict cookie holds', async () => {
    writeCsrfToken('the-cookie-value')
    fetchMock.mockResolvedValue(jsonResponse({}))
    await request('/withdraw', { method: 'POST', body: {} })
    // The two halves of the double submit have to agree, or middleware.ts
    // answers 403 — this is the assertion that catches a divergence.
    expect(csrfHeader()).toBe('the-cookie-value')
  })

  it('mints and persists a token when the cookie jar has none', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await request('/withdraw', { method: 'POST', body: {} })
    const token = csrfHeader()
    expect(token).toBeDefined()
    expect(document.cookie).toContain(`${CSRF_COOKIE_NAME}=${token}`)
  })

  it('reuses the same token across consecutive mutations', async () => {
    // A fresh Response per call — a body can only be read once.
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})))
    await request('/withdraw', { method: 'POST', body: {} })
    await request('/remittance', { method: 'POST', body: {} })
    expect(csrfHeader(0)).toBe(csrfHeader(1))
  })

  it('stamps every mutating api call site, not just a representative one', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})))
    await api.createPaymentRequest('tok', 5n)
    await api.createWithdrawal('tok', 5n, '044', '0123456789')
    await api.createOzowPayment('tok', 100, 'FNB', 'https://app.aframp.com/charge')
    await api.revokeApiKey('tok', 'key-1')
    await api.deleteAccount('tok')
    await api.logout('tok')
    for (const index of [0, 1, 2, 3, 4, 5]) {
      expect(csrfHeader(index)).toEqual(expect.any(String))
    }
  })

  it('does not stamp read-only calls', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([])))
    await api.listTransactions('tok')
    await api.getMe('tok')
    await api.listWithdrawals('tok')
    for (const index of [0, 1, 2]) {
      expect(csrfHeader(index)).toBeUndefined()
    }
  })

  it('sends the request same-origin, so a cross-origin cookie is never attached', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await request('/withdraw', { method: 'POST', body: {} })
    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin')
  })

  it('surfaces a 403 from the CSRF gate as a normal ApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'CSRF validation failed.' }, 403))
    await expect(request('/withdraw', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 403,
      message: 'CSRF validation failed.',
    })
  })
})
