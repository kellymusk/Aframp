/**
 * Tests for the Paystack/Flutterwave payment gateway integrations, including
 * Flutterwave webhook signature verification and gateway resolution.
 */

import crypto from 'crypto'
import {
  FlutterwaveGateway,
  PaystackGateway,
  getPaymentGatewayService,
} from '../payment-gateway'

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

const PAYMENT_DATA = {
  email: 'customer@example.com',
  amount: 1000,
  currency: 'NGN',
  reference: 'BILL-001',
  metadata: {
    billerId: 'dstv',
    billerName: 'DSTV',
    accountNumber: '1234567890',
  },
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('PaystackGateway', () => {
  it('initiates a payment and returns the authorization url', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { data: { authorization_url: 'https://paystack.com/pay/abc', reference: 'BILL-001' } } },
    ])

    const gateway = new PaystackGateway({ gateway: 'paystack', publicKey: 'pk', secretKey: 'sk' })
    const result = await gateway.initiatePayment(PAYMENT_DATA)

    expect(result.authorization_url).toBe('https://paystack.com/pay/abc')
  })

  it('verifies a payment and converts kobo to naira', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { data: { status: 'success', reference: 'BILL-001', amount: 100000, currency: 'NGN', id: 'ps-1' } } },
    ])

    const gateway = new PaystackGateway({ gateway: 'paystack', publicKey: 'pk', secretKey: 'sk' })
    const result = await gateway.verifyPayment('BILL-001')

    expect(result.success).toBe(true)
    expect(result.amount).toBe(1000)
    expect(result.gateway).toBe('paystack')
  })
})

describe('FlutterwaveGateway', () => {
  it('initiates a payment and returns the authorization link', async () => {
    global.fetch = mockFetch([{ ok: true, body: { data: { link: 'https://flutterwave.com/pay/xyz' } } }])

    const gateway = new FlutterwaveGateway({ gateway: 'flutterwave', publicKey: 'pk', secretKey: 'sk' })
    const result = await gateway.initiatePayment(PAYMENT_DATA)

    expect(result.authorization_url).toBe('https://flutterwave.com/pay/xyz')
    expect(result.reference).toBe('BILL-001')
  })

  it('verifies a successful payment', async () => {
    global.fetch = mockFetch([
      {
        ok: true,
        body: { data: { status: 'successful', tx_ref: 'BILL-001', amount: 1000, currency: 'NGN', id: 'flw-1', created_at: '2026-01-01' } },
      },
    ])

    const gateway = new FlutterwaveGateway({ gateway: 'flutterwave', publicKey: 'pk', secretKey: 'sk' })
    const result = await gateway.verifyPayment('BILL-001')

    expect(result.success).toBe(true)
    expect(result.status).toBe('success')
    expect(result.gateway).toBe('flutterwave')
  })

  describe('verifyWebhookSignature', () => {
    const secretHash = 'my-webhook-secret'

    it('accepts a verif-hash header that matches the secret exactly', () => {
      const isValid = FlutterwaveGateway.verifyWebhookSignature(
        '{"event":"charge.completed"}',
        { verifHash: secretHash },
        secretHash
      )
      expect(isValid).toBe(true)
    })

    it('rejects a verif-hash header that does not match', () => {
      const isValid = FlutterwaveGateway.verifyWebhookSignature(
        '{"event":"charge.completed"}',
        { verifHash: 'wrong-hash' },
        secretHash
      )
      expect(isValid).toBe(false)
    })

    it('accepts a valid HMAC-SHA256 signature header', () => {
      const rawBody = '{"event":"charge.completed"}'
      const signature = crypto.createHmac('sha256', secretHash).update(rawBody).digest('hex')

      const isValid = FlutterwaveGateway.verifyWebhookSignature(rawBody, { signature }, secretHash)
      expect(isValid).toBe(true)
    })

    it('rejects an HMAC signature computed with the wrong secret', () => {
      const rawBody = '{"event":"charge.completed"}'
      const signature = crypto.createHmac('sha256', 'wrong-secret').update(rawBody).digest('hex')

      const isValid = FlutterwaveGateway.verifyWebhookSignature(rawBody, { signature }, secretHash)
      expect(isValid).toBe(false)
    })

    it('rejects when neither header is present', () => {
      const isValid = FlutterwaveGateway.verifyWebhookSignature('{}', {}, secretHash)
      expect(isValid).toBe(false)
    })
  })
})

describe('getPaymentGatewayService', () => {
  const originalPaymentGateway = process.env.PAYMENT_GATEWAY

  afterEach(() => {
    if (originalPaymentGateway === undefined) {
      delete process.env.PAYMENT_GATEWAY
    } else {
      process.env.PAYMENT_GATEWAY = originalPaymentGateway
    }
  })

  it('returns a PaystackGateway when explicitly requested', () => {
    const service = getPaymentGatewayService('paystack')
    expect(service).toBeInstanceOf(PaystackGateway)
  })

  it('returns a FlutterwaveGateway when explicitly requested', () => {
    const service = getPaymentGatewayService('flutterwave')
    expect(service).toBeInstanceOf(FlutterwaveGateway)
  })

  it('falls back to the country default when no gateway is passed', () => {
    const service = getPaymentGatewayService(undefined, 'KE')
    expect(service).toBeInstanceOf(FlutterwaveGateway)
  })

  it('falls back to PAYMENT_GATEWAY env var when no gateway or country default applies', () => {
    process.env.PAYMENT_GATEWAY = 'flutterwave'
    const service = getPaymentGatewayService(undefined, 'ZZ')
    expect(service).toBeInstanceOf(FlutterwaveGateway)
  })

  it('defaults to PaystackGateway when nothing else resolves', () => {
    delete process.env.PAYMENT_GATEWAY
    const service = getPaymentGatewayService()
    expect(service).toBeInstanceOf(PaystackGateway)
  })
})
