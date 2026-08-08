/**
 * Tests for the Flutterwave mobile money collections integration.
 */

import { FlutterwaveMobileMoneyProvider } from '../flutterwave'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(responses: Array<{ ok: boolean; status?: number; body?: unknown }>) {
  let callIndex = 0
  return jest.fn().mockImplementation(() => {
    const res = responses[callIndex] ?? responses[responses.length - 1]
    callIndex++
    return Promise.resolve({
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 400),
      statusText: res.ok ? 'OK' : 'Bad Request',
      json: () => Promise.resolve(res.body ?? {}),
    })
  })
}

const BASE_PARAMS = {
  phoneNumber: '+233241234567',
  amount: 50,
  currency: 'GHS',
  accountReference: 'Test Customer',
  transactionDesc: 'Test payment',
  externalId: 'ext-001',
}

beforeEach(() => {
  process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_TEST-test-key'
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// initiatePayment
// ---------------------------------------------------------------------------

describe('FlutterwaveMobileMoneyProvider.initiatePayment', () => {
  it('returns PENDING status when the charge is accepted', async () => {
    global.fetch = mockFetch([
      {
        ok: true,
        body: { status: 'success', message: 'ok', data: { id: 12345, tx_ref: 'ext-001', status: 'pending' } },
      },
    ])

    const provider = new FlutterwaveMobileMoneyProvider()
    const result = await provider.initiatePayment(BASE_PARAMS)

    expect(result.status).toBe('PENDING')
    expect(result.provider).toBe('flutterwave')
    expect(result.transactionId).toBe('12345')
  })

  it('throws MobileMoneyError when the charge response status is not success', async () => {
    global.fetch = mockFetch([{ ok: true, body: { status: 'error', message: 'Invalid phone number' } }])

    const provider = new FlutterwaveMobileMoneyProvider()
    await expect(provider.initiatePayment(BASE_PARAMS)).rejects.toMatchObject({ code: 'FAILED' })
  })

  it('throws when the currency has no configured charge type', async () => {
    global.fetch = mockFetch([{ ok: true, body: {} }])

    const provider = new FlutterwaveMobileMoneyProvider()
    await expect(
      provider.initiatePayment({ ...BASE_PARAMS, currency: 'USD' })
    ).rejects.toThrow(/not configured for currency/)
  })

  it('throws when the HTTP request fails', async () => {
    global.fetch = mockFetch([{ ok: false, status: 500 }])

    const provider = new FlutterwaveMobileMoneyProvider()
    await expect(provider.initiatePayment(BASE_PARAMS)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// getStatus
// ---------------------------------------------------------------------------

describe('FlutterwaveMobileMoneyProvider.getStatus', () => {
  it('returns SUCCESSFUL when the transaction verifies as successful', async () => {
    global.fetch = mockFetch([{ ok: true, body: { status: 'success', data: { status: 'successful' } } }])

    const provider = new FlutterwaveMobileMoneyProvider()
    const status = await provider.getStatus('12345')
    expect(status).toBe('SUCCESSFUL')
  })

  it('throws MobileMoneyError with FAILED code when the transaction failed', async () => {
    global.fetch = mockFetch([{ ok: true, body: { status: 'success', data: { status: 'failed' } } }])

    const provider = new FlutterwaveMobileMoneyProvider()
    await expect(provider.getStatus('12345')).rejects.toMatchObject({ code: 'FAILED' })
  })

  it('returns PENDING while the transaction is still pending', async () => {
    global.fetch = mockFetch([{ ok: true, body: { status: 'success', data: { status: 'pending' } } }])

    const provider = new FlutterwaveMobileMoneyProvider()
    const status = await provider.getStatus('12345')
    expect(status).toBe('PENDING')
  })
})
