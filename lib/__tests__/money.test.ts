import {
  formatStroops,
  isAmountMultipleOf,
  isWholeKobo,
  parseAmountToStroops,
  STROOPS_PER_UNIT,
} from '@/lib/money'

describe('formatStroops', () => {
  it('formats a whole unit with no fraction', () => {
    expect(formatStroops(STROOPS_PER_UNIT)).toBe('1')
  })

  it('drops trailing zeros in the fraction', () => {
    expect(formatStroops(25_000_000n)).toBe('2.5')
  })

  it('formats a negative amount', () => {
    expect(formatStroops(-25_000_000n)).toBe('-2.5')
  })

  it('formats a negative whole unit', () => {
    expect(formatStroops(-10_000_000n)).toBe('-1')
  })

  it('formats zero', () => {
    expect(formatStroops(0n)).toBe('0')
  })

  it('adds thousands separators to the whole part', () => {
    expect(formatStroops(12_345n * STROOPS_PER_UNIT)).toBe('12,345')
  })
})

describe('parseAmountToStroops', () => {
  it('parses a whole number', () => {
    expect(parseAmountToStroops('2')).toBe(2n * STROOPS_PER_UNIT)
  })

  it('parses a decimal amount', () => {
    expect(parseAmountToStroops('2.5')).toBe(25_000_000n)
  })

  it('parses all seven supported decimal places', () => {
    expect(parseAmountToStroops('1.2345678')).toBe(12_345_678n)
  })

  it('rejects more than 7 decimal places rather than rounding', () => {
    expect(parseAmountToStroops('1.12345678')).toBeNull()
  })

  it('rejects malformed input', () => {
    expect(parseAmountToStroops('abc')).toBeNull()
    expect(parseAmountToStroops('')).toBeNull()
    expect(parseAmountToStroops('.')).toBeNull()
  })

  it('round-trips several stroop values through formatting', () => {
    const values = [0n, 1n, STROOPS_PER_UNIT, 12_345_678n, 999_999_999n]

    for (const value of values) {
      expect(parseAmountToStroops(formatStroops(value))).toBe(value)
    }
  })
})

describe('isWholeKobo', () => {
  it('accepts an amount that is a whole number of kobo', () => {
    expect(isWholeKobo(500_000_000n)).toBe(true)
  })

  it('rejects an amount smaller than one kobo', () => {
    expect(isWholeKobo(1n)).toBe(false)
  })
})

describe('isAmountMultipleOf', () => {
  it('accepts amounts aligned to the configured precision', () => {
    expect(isAmountMultipleOf(200_000n, 100_000n)).toBe(true)
  })

  it('rejects amounts smaller than the configured precision', () => {
    expect(isAmountMultipleOf(1n, 100_000n)).toBe(false)
  })

  it('rejects a non-positive precision', () => {
    expect(isAmountMultipleOf(1n, 0n)).toBe(false)
  })
})
