/**
 * Tests for the M-Pesa STK Push integration.
 */

import { MpesaProvider, _resetTokenCache } from '../mpesa'
import { MobileMoneyError } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
  let callIndex = 0
  return jest.fn().mockImplementation(() => {
    const res = responses[callIndex] ?? responses[responses.length - 1]
    callIndex++
    return Promise.resolve({
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 400),
      statusText: res.ok ? 'OK' : 'Bad Request',
      json: () => Promise.resolve(res.body),
    })
  })
}

const BASE_PARAMS = {
  phoneNumber: '+254712345678',
  amount: 100,
  currency: 'KES',
  accountReference: 'TEST-REF',
  transactionDesc: 'Test payment',
  externalId: 'ext-001',
}

beforeEach(() => {
  _resetTokenCache()
  process.env.MPESA_CONSUMER_KEY = 'test-key'
  process.env.MPESA_CONSUMER_SECRET = 'test-secret'
  process.env.MPESA_SHORTCODE = '174379'
  process.env.MPESA_PASSKEY = 'test-passkey'
  process.env.MPESA_ENV = 'sandbox'
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()

  _resetTokenCache()

})

// ---------------------------------------------------------------------------
// STK Push initiated
// ---------------------------------------------------------------------------

describe('MpesaProvider.initiatePayment', () => {
  it('returns PENDING status when STK push is accepted', async () => {
    global.fetch = mockFetch([
      // OAuth token
      { ok: true, body: { access_token: 'tok', expires_in: '3600' } },
      // STK push
      {
        ok: true,
        body: {
          MerchantRequestID: 'mrq-1',
          CheckoutRequestID: 'crq-1',
          ResponseCode: '0',
          ResponseDescription: 'Success',
          CustomerMessage: 'Success',
        },
      },
    ])

    const provider = new MpesaProvider()
    const result = await provider.initiatePayment(BASE_PARAMS)

    expect(result.status).toBe('PENDING')
    expect(result.provider).toBe('mpesa')
    expect(result.transactionId).toBe('crq-1')
  })

  it('throws MobileMoneyError when STK push ResponseCode is non-zero', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: '3600' } },
      {
        ok: true,
        body: {
          MerchantRequestID: 'mrq-2',
          CheckoutRequestID: 'crq-2',
          ResponseCode: '1',
          ResponseDescription: 'Invalid phone number',
          CustomerMessage: 'Invalid phone number',
        },
      },
    ])

    const provider = new MpesaProvider()
    await expect(provider.initiatePayment(BASE_PARAMS)).rejects.toThrow(MobileMoneyError)
  })
})

// ---------------------------------------------------------------------------
// ResultCode: 0 confirmed
// ---------------------------------------------------------------------------

describe('MpesaProvider.getStatus', () => {
  it('returns SUCCESSFUL when ResultCode is 0', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: '3600' } },
      {
        ok: true,
        body: {
          ResponseCode: '0',
          ResponseDescription: 'Success',
          MerchantRequestID: 'mrq-1',
          CheckoutRequestID: 'crq-1',
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.',
        },
      },
    ])

    const provider = new MpesaProvider()
    const status = await provider.getStatus('crq-1')
    expect(status).toBe('SUCCESSFUL')
  })

  // ── INSUFFICIENT_FUNDS ──────────────────────────────────────────────────

  it('throws MobileMoneyError with INSUFFICIENT_FUNDS code when ResultCode is 1', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: '3600' } },
      {
        ok: true,
        body: {
          ResponseCode: '0',
          ResponseDescription: 'Success',
          MerchantRequestID: 'mrq-1',
          CheckoutRequestID: 'crq-1',
          ResultCode: '1',
          ResultDesc: 'The balance is insufficient for the transaction.',
        },
      },
    ])

    const provider = new MpesaProvider()
    await expect(provider.getStatus('crq-1')).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
    })
  })

  // ── CANCELLED ───────────────────────────────────────────────────────────

  it('throws MobileMoneyError with CANCELLED code when ResultCode is 1032', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { access_token: 'tok', expires_in: '3600' } },
      {
        ok: true,
        body: {
          ResponseCode: '0',
          ResponseDescription: 'Success',
          MerchantRequestID: 'mrq-1',
          CheckoutRequestID: 'crq-1',
          ResultCode: '1032',
          ResultDesc: 'Request cancelled by user.',
        },
      },
    ])

    const provider = new MpesaProvider()
    await expect(provider.getStatus('crq-1')).rejects.toMatchObject({
      code: 'CANCELLED',
    })
  })
})
