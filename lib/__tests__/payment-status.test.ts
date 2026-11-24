import { PAYMENT_STATUS_LABEL, paymentStatusLabel, paymentStatusVariant } from '@/lib/payment-status'

describe('payment status', () => {
  it('has a label for every status', () => {
    expect(PAYMENT_STATUS_LABEL).toEqual({
      detected: 'Incoming',
      verified: 'Confirming',
      confirmed: 'Paid',
      failed: 'Failed',
    })
    expect(paymentStatusLabel('confirmed')).toBe('Paid')
  })

  it('maps variants', () => {
    expect(paymentStatusVariant('confirmed')).toBe('default')
    expect(paymentStatusVariant('failed')).toBe('destructive')
    expect(paymentStatusVariant('detected')).toBe('secondary')
    expect(paymentStatusVariant('verified')).toBe('secondary')
  })
})
