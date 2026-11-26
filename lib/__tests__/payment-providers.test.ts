import { calculateFees, getAmountValidationError } from '../payment-providers'

describe('payment provider fee calculations', () => {
  it('calculates fees in minor units and rounds each fee to cents', () => {
    expect(calculateFees(50.01, 'paystack')).toEqual({
      processingFee: 2.45,
      vat: 0.37,
      totalFees: 2.82,
      totalCost: 52.83,
    })
  })

  it('rounds exact half-cent processing fees up', () => {
    expect(calculateFees(55, 'paystack')).toEqual({
      processingFee: 2.6,
      vat: 0.39,
      totalFees: 2.99,
      totalCost: 57.99,
    })
  })

  it('rejects amounts below or above provider limits', () => {
    expect(() => calculateFees(9.99, 'ozow')).toThrow('Minimum amount is R10.00.')
    expect(() => calculateFees(500000.01, 'ozow')).toThrow('Maximum amount is R500,000.00.')
  })

  it('rejects non-finite amounts', () => {
    expect(() => calculateFees(Number.NaN, 'ozow')).toThrow('Amount must be a valid number.')
    expect(getAmountValidationError(Number.POSITIVE_INFINITY, 'ozow')).toBe(
      'Amount must be a valid number.'
    )
  })
})
