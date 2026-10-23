import { isValidSep7Uri } from '@/lib/sep7'

describe('isValidSep7Uri', () => {
  it('accepts a well-formed web+stellar SEP-7 URI', () => {
    expect(isValidSep7Uri('web+stellar:pay?destination=GABC&amount=10')).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidSep7Uri(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidSep7Uri(undefined)).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidSep7Uri('')).toBe(false)
  })

  it('rejects the bare scheme with no payload', () => {
    expect(isValidSep7Uri('web+stellar:')).toBe(false)
  })

  it('rejects non-SEP-7 URIs', () => {
    expect(isValidSep7Uri('https://example.com/pay')).toBe(false)
  })
})
