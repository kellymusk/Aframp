import { calculateCryptoAmount, calculateProcessingFee } from '../calculations'

describe('Exchange Rate Calculations', () => {
  it('calculates crypto amount accurately', () => {
    expect(calculateCryptoAmount(1000, 0.0012)).toBe(1.2)
    expect(calculateCryptoAmount(50000, 0.00085)).toBe(42.5)
  })

  it('handles zero and negative values', () => {
    expect(calculateCryptoAmount(0, 0.0012)).toBe(0)
    expect(calculateCryptoAmount(-100, 0.0012)).toBe(0)
    expect(calculateCryptoAmount(1000, 0)).toBe(0)
  })

  it('handles edge cases', () => {
    expect(calculateCryptoAmount(1, 1)).toBe(1)
    expect(calculateCryptoAmount(0.01, 100)).toBe(1)
  })
})

describe('Fee Calculations', () => {
  it('calculates bank transfer fee (0%)', () => {
    expect(calculateProcessingFee(10000, 'bank_transfer')).toBe(0)
    expect(calculateProcessingFee(500000, 'bank_transfer')).toBe(0)
  })

  it('calculates card payment fee (1.5%)', () => {
    expect(calculateProcessingFee(10000, 'card')).toBe(150)
    expect(calculateProcessingFee(50000, 'card')).toBe(750)
  })

  it('calculates mobile money fee (0.5%)', () => {
    expect(calculateProcessingFee(10000, 'mobile_money')).toBe(50)
    expect(calculateProcessingFee(50000, 'mobile_money')).toBe(250)
  })

  it('handles zero and negative amounts', () => {
    expect(calculateProcessingFee(0, 'card')).toBe(0)
    expect(calculateProcessingFee(-100, 'card')).toBe(0)
  })
})
