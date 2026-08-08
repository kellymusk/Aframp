/**
 * lib/email/__tests__/resend-client.test.ts
 *
 * Unit tests for the Resend email client helpers.
 *
 * The Resend SDK is mocked so no real HTTP requests are made.
 * We verify:
 *   1. That each helper calls resend.emails.send with the right shape
 *   2. That missing RESEND_API_KEY throws a clear error
 *   3. That Resend API errors are propagated correctly
 *   4. That sendTransferCompleteEmail throws when transactionHash is absent
 */

import React from 'react'

// ── Mock Resend ──────────────────────────────────────────────────────────────

const mockSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

// ── Mock email components ────────────────────────────────────────────────────
// We only care that the helpers pass a React element — we don't need to
// render real HTML in unit tests.

jest.mock('@/emails/OrderConfirmation', () => ({
  OrderConfirmation: (props: object) => React.createElement('div', { 'data-testid': 'order-confirmation', ...props }),
}))

jest.mock('@/emails/PaymentReceived', () => ({
  PaymentReceived: (props: object) => React.createElement('div', { 'data-testid': 'payment-received', ...props }),
}))

jest.mock('@/emails/TransferComplete', () => ({
  TransferComplete: (props: object) => React.createElement('div', { 'data-testid': 'transfer-complete', ...props }),
}))

jest.mock('@/emails/TransactionFailed', () => ({
  TransactionFailed: (props: object) => React.createElement('div', { 'data-testid': 'transaction-failed', ...props }),
}))

jest.mock('@/emails/PriceAlertEmail', () => ({
  PriceAlertEmail: (props: object) => React.createElement('div', { 'data-testid': 'price-alert', ...props }),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Re-isolate the module under test so env-var changes take effect per suite. */
async function loadModule() {
  jest.resetModules()
  // Re-apply mocks after resetModules
  jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
  }))
  return import('@/lib/email/resend-client')
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ORDER_PAYLOAD = {
  to: 'user@example.com',
  orderId: 'ord_abc123def456',
  amount: 10000,
  currency: 'NGN',
  cryptoAmount: 0.0089,
  cryptoAsset: 'cNGN',
}

const TRANSFER_PAYLOAD = { ...ORDER_PAYLOAD, transactionHash: 'a1b2c3d4e5f6a1b2c3d4e5f6' }

const PRICE_ALERT_PAYLOAD = {
  to: 'user@example.com',
  asset: 'cNGN',
  direction: 'below' as const,
  threshold: 1000,
  actualValue: 950,
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('resend-client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEND_API_KEY = 'test_re_key'
    process.env.RESEND_FROM_EMAIL = 'AFRAMP <no-reply@aframp.com>'
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
  })

  // ── sendEmail generic ──────────────────────────────────────────────────────

  describe('sendEmail', () => {
    it('returns message id on success', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_001' }, error: null })
      const { sendEmail } = await loadModule()

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Hello',
        react: React.createElement('div'),
      })

      expect(result).toEqual({ id: 'msg_001' })
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'AFRAMP <no-reply@aframp.com>',
          to: 'test@example.com',
          subject: 'Hello',
        })
      )
    })

    it('throws when Resend returns an error object', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { name: 'validation_error', message: 'Invalid email' },
      })
      const { sendEmail } = await loadModule()

      await expect(
        sendEmail({ to: 'bad', subject: 'X', react: React.createElement('div') })
      ).rejects.toThrow('validation_error')
    })

    it('throws when RESEND_API_KEY is not set', async () => {
      delete process.env.RESEND_API_KEY
      const { sendEmail } = await loadModule()

      await expect(
        sendEmail({ to: 'x@x.com', subject: 'Y', react: React.createElement('div') })
      ).rejects.toThrow('RESEND_API_KEY')
    })
  })

  // ── sendOrderConfirmationEmail ─────────────────────────────────────────────

  describe('sendOrderConfirmationEmail', () => {
    it('calls send with order_created subject', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_002' }, error: null })
      const { sendOrderConfirmationEmail } = await loadModule()

      const result = await sendOrderConfirmationEmail(ORDER_PAYLOAD)

      expect(result.id).toBe('msg_002')
      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toMatch(/Order Created/i)
      expect(call.subject).toContain(ORDER_PAYLOAD.orderId.slice(-8).toUpperCase())
      expect(call.to).toBe(ORDER_PAYLOAD.to)
    })
  })

  // ── sendPaymentReceivedEmail ───────────────────────────────────────────────

  describe('sendPaymentReceivedEmail', () => {
    it('calls send with payment_received subject', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_003' }, error: null })
      const { sendPaymentReceivedEmail } = await loadModule()

      const result = await sendPaymentReceivedEmail(ORDER_PAYLOAD)

      expect(result.id).toBe('msg_003')
      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toMatch(/Payment Confirmed/i)
      expect(call.subject).toContain(ORDER_PAYLOAD.cryptoAsset)
    })
  })

  // ── sendTransferCompleteEmail ─────────────────────────────────────────────

  describe('sendTransferCompleteEmail', () => {
    it('calls send with transfer_complete subject', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_004' }, error: null })
      const { sendTransferCompleteEmail } = await loadModule()

      const result = await sendTransferCompleteEmail(TRANSFER_PAYLOAD)

      expect(result.id).toBe('msg_004')
      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toMatch(/Transfer Complete/i)
      expect(call.subject).toContain(ORDER_PAYLOAD.cryptoAsset)
    })

    it('throws when transactionHash is missing', async () => {
      const { sendTransferCompleteEmail } = await loadModule()

      await expect(sendTransferCompleteEmail(ORDER_PAYLOAD)).rejects.toThrow('transactionHash')
    })
  })

  // ── sendTransactionFailedEmail ────────────────────────────────────────────

  describe('sendTransactionFailedEmail', () => {
    it('calls send with transaction_failed subject', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_005' }, error: null })
      const { sendTransactionFailedEmail } = await loadModule()

      const result = await sendTransactionFailedEmail(ORDER_PAYLOAD)

      expect(result.id).toBe('msg_005')
      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toMatch(/Transaction Failed/i)
    })
  })

  // ── sendPriceAlertEmail ────────────────────────────────────────────────────

  describe('sendPriceAlertEmail', () => {
    it('calls send with price alert subject for below direction', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_006' }, error: null })
      const { sendPriceAlertEmail } = await loadModule()

      const result = await sendPriceAlertEmail(PRICE_ALERT_PAYLOAD)

      expect(result.id).toBe('msg_006')
      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toMatch(/Price Alert/i)
      expect(call.subject).toContain('dropped below')
      expect(call.subject).toContain(PRICE_ALERT_PAYLOAD.asset)
    })

    it('calls send with price alert subject for above direction', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_007' }, error: null })
      const { sendPriceAlertEmail } = await loadModule()

      await sendPriceAlertEmail({ ...PRICE_ALERT_PAYLOAD, direction: 'above', actualValue: 1200 })

      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toContain('risen above')
    })

    it('includes recipient email in send call', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_008' }, error: null })
      const { sendPriceAlertEmail } = await loadModule()

      await sendPriceAlertEmail(PRICE_ALERT_PAYLOAD)

      expect(mockSend.mock.calls[0][0].to).toBe(PRICE_ALERT_PAYLOAD.to)
    })
  })

  // ── Resend API key missing (lazy init check) ──────────────────────────────

  describe('missing RESEND_API_KEY', () => {
    it('throws descriptive error on first send attempt', async () => {
      delete process.env.RESEND_API_KEY
      const { sendOrderConfirmationEmail } = await loadModule()

      await expect(sendOrderConfirmationEmail(ORDER_PAYLOAD)).rejects.toThrow('RESEND_API_KEY')
    })
  })
})
