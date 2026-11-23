import { normalizePhone, SUPPORTED_COUNTRIES, E164_REGEX } from '../phone'

const NG = SUPPORTED_COUNTRIES.find((c) => c.code === 'NG')!
const KE = SUPPORTED_COUNTRIES.find((c) => c.code === 'KE')!
const GH = SUPPORTED_COUNTRIES.find((c) => c.code === 'GH')!

describe('normalizePhone – Nigeria (NG)', () => {
  it('accepts E.164 "+2348011234567"', () => {
    expect(normalizePhone('+2348011234567', NG)).toBe('+2348011234567')
  })

  it('accepts dial code without "+" → "2348011234567"', () => {
    expect(normalizePhone('2348011234567', NG)).toBe('+2348011234567')
  })

  it('accepts dial + trunk-0 + national → "23408011234567" (#1129)', () => {
    expect(normalizePhone('23408011234567', NG)).toBe('+2348011234567')
  })

  it('accepts local trunk-0 format → "08011234567"', () => {
    expect(normalizePhone('08011234567', NG)).toBe('+2348011234567')
  })

  it('accepts number with spaces', () => {
    expect(normalizePhone('+234 801 123 4567', NG)).toBe('+2348011234567')
  })

  it('throws on wrong digit count', () => {
    expect(() => normalizePhone('080112345', NG)).toThrow('10 digits')
  })
})

describe('normalizePhone – Kenya (KE)', () => {
  it('accepts E.164 "+254712345678"', () => {
    expect(normalizePhone('+254712345678', KE)).toBe('+254712345678')
  })

  it('accepts "254712345678" without "+"', () => {
    expect(normalizePhone('254712345678', KE)).toBe('+254712345678')
  })

  it('accepts dial + trunk-0 + national → "2540712345678"', () => {
    expect(normalizePhone('2540712345678', KE)).toBe('+254712345678')
  })
})

describe('normalizePhone – Ghana (GH)', () => {
  it('accepts E.164 "+233241234567"', () => {
    expect(normalizePhone('+233241234567', GH)).toBe('+233241234567')
  })

  it('accepts "233241234567" without "+"', () => {
    expect(normalizePhone('233241234567', GH)).toBe('+233241234567')
  })

  it('accepts dial + trunk-0 + national → "2330241234567"', () => {
    expect(normalizePhone('2330241234567', GH)).toBe('+233241234567')
  })
})

describe('E164_REGEX', () => {
  it('passes all normalised outputs', () => {
    const cases = [
      normalizePhone('+2348011234567', NG),
      normalizePhone('23408011234567', NG),
      normalizePhone('2540712345678', KE),
      normalizePhone('2330241234567', GH),
    ]
    for (const e164 of cases) {
      expect(E164_REGEX.test(e164)).toBe(true)
    }
  })
})
