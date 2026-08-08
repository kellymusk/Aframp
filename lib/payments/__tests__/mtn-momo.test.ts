/**
 * Tests for the MTN MoMo Collections API integration.
 */

import { MtnMomoProvider, _resetTokenCache } from '../mtn-momo'
import { MobileMoneyError } from '../types'

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
  accountReference: 'TEST-REF',
  transactionDesc: 'Test payment',
  externalId: 'ext-001',
}

beforeEach(() => {
  _resetTokenCache()
  process.env.MTN_MOMO_SUBSCRIPTION_KEY = 'test-sub-key'
  process.env.MTN_MOMO_API_USER = '550e8400-e29b-41d4-a716-446655440000'
  process.env.MTN_MOMO_API_KEY = 'test-api-key'
  process.env.MTN_MOMO_ENV = 'sandbox'
})

afterEach(() => {
  jest.restoreAllMocks()
  _resetTokenCache()
})

// ---------------------------------------------------------------------------
// requestToPay initiated
// ---------------------------------------------------------------------------

describe('MtnMomoProvider.initiatePayment', () => {
  it('returns PENDING status when requestToPay is accepted (202)', async () => {
    global.fetch = mockFetch([
      // Token
      { ok: true, body: { access_token: 'tok', expires_in: 3600 } },
      // requestToPay — 202 Accepted
      { ok: true, status: 202 },
    ])

    const provider = new MtnMomoProvider()
    const result = await provider.initiatePayment(BASE_PARAMS)

    expect(result.status).toBe('PENDING')
    expect(result.provider).toBe('mtn_momo')
    expect(typeof result.transactionId).toBe('string')
    expect(result.transactionId.length).toBeGreaterThan(0)
  })

  it('throws when requestToPay returns a non-202 status', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: 3600 } },
      { ok: false, status: 400, body: { code: 'INVALID_CALLBACK_URL_HOST' } },
    ])

    const provider = new MtnMomoProvider()
    await expect(provider.initiatePayment(BASE_PARAMS)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Status polling
// ---------------------------------------------------------------------------

describe('MtnMomoProvider.getStatus', () => {
  it('returns SUCCESSFUL when poll result is SUCCESSFUL', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: 3600 } },
      { ok: true, body: { status: 'SUCCESSFUL' } },
    ])

    const provider = new MtnMomoProvider()
    const status = await provider.getStatus('ref-123')
    expect(status).toBe('SUCCESSFUL')
  })

  it('throws MobileMoneyError with FAILED code when poll result is FAILED', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: 3600 } },
      {
        ok: true,
        body: {
          status: 'FAILED',
          reason: { code: 'PAYER_NOT_FOUND', message: 'Payer not found' },
        },
      },
    ])

    const provider = new MtnMomoProvider()
    await expect(provider.getStatus('ref-123')).rejects.toMatchObject({
      code: 'FAILED',
    })
  })

  it('returns PENDING when poll result is still PENDING', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: 3600 } },
      { ok: true, body: { status: 'PENDING' } },
    ])

    const provider = new MtnMomoProvider()
    const status = await provider.getStatus('ref-123')
    expect(status).toBe('PENDING')
  })
})
