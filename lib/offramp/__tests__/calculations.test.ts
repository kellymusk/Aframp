import { calculateFiatAmount, calculateFees, getMinMax } from '@/lib/offramp/calculations'

describe('calculateFiatAmount', () => {
  it('returns 0 when amount is 0', () => {
    expect(calculateFiatAmount(0, 1600)).toBe(0)
  })

  it('returns 0 when amount is negative', () => {
    expect(calculateFiatAmount(-1, 1600)).toBe(0)
  })

  it('multiplies amount by rate', () => {
    expect(calculateFiatAmount(1, 1600)).toBe(1600)
  })

  it('handles fractional amounts', () => {
    expect(calculateFiatAmount(0.5, 1600)).toBe(800)
  })

  it('handles large amounts', () => {
    expect(calculateFiatAmount(100, 1600)).toBe(160000)
  })
})

describe('calculateFees', () => {
  it('calculates Stellar network fee correctly', () => {
    const result = calculateFees(100000, 'Stellar')
    expect(result.networkFee).toBe(15)
    expect(result.offrampFee).toBe(1000) // 1% of 100000
    expect(result.bankFee).toBe(0)
    expect(result.totalFees).toBe(1015)
    expect(result.receiveAmount).toBe(98985)
  })

  it('calculates Ethereum network fee correctly', () => {
    const result = calculateFees(100000, 'Ethereum')
    expect(result.networkFee).toBe(1500)
    expect(result.totalFees).toBe(2500)
    expect(result.receiveAmount).toBe(97500)
  })

  it('calculates Polygon network fee correctly', () => {
    const result = calculateFees(100000, 'Polygon')
    expect(result.networkFee).toBe(120)
  })

  it('calculates Base network fee correctly', () => {
    const result = calculateFees(100000, 'Base')
    expect(result.networkFee).toBe(200)
  })

  it('falls back to Stellar fee for unknown chains', () => {
    const result = calculateFees(100000, 'UnknownChain')
    expect(result.networkFee).toBe(15)
  })

  it('supports custom offramp fee rate', () => {
    const result = calculateFees(100000, 'Stellar', 0.02)
    expect(result.offrampFee).toBe(2000)
  })

  it('receiveAmount is never negative', () => {
    // Very high fees scenario
    const result = calculateFees(1, 'Ethereum') // fiatAmount=1, fees=15+1=16
    expect(result.receiveAmount).toBe(0)
  })

  it('bankFee is always 0', () => {
    const result = calculateFees(50000, 'Stellar')
    expect(result.bankFee).toBe(0)
  })
})

describe('getMinMax', () => {
  it('returns NGN limits', () => {
    expect(getMinMax('NGN')).toEqual({ min: 5_000, max: 5_000_000 })
  })

  it('returns KES limits', () => {
    expect(getMinMax('KES')).toEqual({ min: 500, max: 500_000 })
  })

  it('returns GHS limits', () => {
    expect(getMinMax('GHS')).toEqual({ min: 50, max: 50_000 })
  })

  it('returns ZAR limits', () => {
    expect(getMinMax('ZAR')).toEqual({ min: 100, max: 100_000 })
  })

  it('returns UGX limits', () => {
    expect(getMinMax('UGX')).toEqual({ min: 20_000, max: 20_000_000 })
  })

  it('NGN min is lower than max', () => {
    const { min, max } = getMinMax('NGN')
    expect(min).toBeLessThan(max)
  })
})
