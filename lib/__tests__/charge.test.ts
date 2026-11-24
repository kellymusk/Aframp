import { calculateFiatEquivalent } from '@/lib/charge'

describe('calculateFiatEquivalent', () => {
  it('returns zero for inputs the charge keypad cannot produce', () => {
    expect(calculateFiatEquivalent('', 24_900n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('.', 24_900n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('0', 24_900n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('-5', 24_900n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('abc', 24_900n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('1e3', 24_900n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('1.12345678', 24_900n)).toBe('≈ ₦0')
  })

  it('computes the total from integer stroops and kobo', () => {
    expect(calculateFiatEquivalent('50', 24_900n)).toBe('≈ ₦12,450')
    expect(calculateFiatEquivalent('1,000', 30_000n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('1000', 30_000n)).toBe('≈ ₦300,000')
  })

  it('accepts a safe integer number rate as well as bigint', () => {
    expect(calculateFiatEquivalent('50', 24_900)).toBe('≈ ₦12,450')
    expect(calculateFiatEquivalent('1.5', 20_000)).toBe('≈ ₦300')
    expect(calculateFiatEquivalent('0.25', 10_000)).toBe('≈ ₦25')
    expect(calculateFiatEquivalent('10.55', 20_000)).toBe('≈ ₦2,110')
  })

  it('rounds to the nearest kobo without float arithmetic', () => {
    expect(calculateFiatEquivalent('0.001', 24_900n)).toBe('≈ ₦0.25')
    expect(calculateFiatEquivalent('0.01', 24_900n)).toBe('≈ ₦2.49')
  })

  it('uses the supplied currency symbol', () => {
    expect(calculateFiatEquivalent('50', 24_900n, '$')).toBe('≈ $12,450')
    expect(calculateFiatEquivalent('invalid', 24_900n, 'KSh')).toBe('≈ KSh0')
  })

  it('returns zero for a missing or invalid rate', () => {
    expect(calculateFiatEquivalent('50', 0n)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('50', -1)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('50', 249.5)).toBe('≈ ₦0')
  })
})
