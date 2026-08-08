import {
  DEFAULT_OFFRAMP_COUNTRY,
  OFFRAMP_COUNTRIES,
  OFFRAMP_COUNTRY_CODES,
  countryForCurrency,
  getOfframpCountry,
  isOfframpCountryCode,
  isValidAccountNumber,
  sanitizeAccountNumber,
  validateAccountNumber,
} from '@/lib/offramp/countries'

describe('offramp country registry', () => {
  it('covers every fiat currency the offramp can price a withdrawal in', () => {
    // If a currency reaches the calculator with no country to pay out to, the
    // customer gets a quote they cannot settle.
    const currencies = OFFRAMP_COUNTRY_CODES.map((code) => OFFRAMP_COUNTRIES[code].currency)
    expect(new Set(currencies)).toEqual(new Set(['NGN', 'KES', 'GHS', 'ZAR', 'UGX']))
  })

  it('maps each currency to exactly one country', () => {
    expect(countryForCurrency('NGN')?.code).toBe('NG')
    expect(countryForCurrency('KES')?.code).toBe('KE')
    expect(countryForCurrency('GHS')?.code).toBe('GH')
    expect(countryForCurrency('ZAR')?.code).toBe('ZA')
    expect(countryForCurrency('UGX')?.code).toBe('UG')
  })

  it('only claims a Paystack slug where the directory is Paystack-backed', () => {
    for (const code of OFFRAMP_COUNTRY_CODES) {
      const country = OFFRAMP_COUNTRIES[code]
      if (country.bankDirectory === 'paystack') {
        expect(country.paystackSlug).toBeTruthy()
      } else {
        expect(country.paystackSlug).toBeNull()
      }
    }
  })

  it('recognises supported codes and rejects everything else', () => {
    expect(isOfframpCountryCode('NG')).toBe(true)
    expect(isOfframpCountryCode('ke')).toBe(true)
    expect(isOfframpCountryCode('TZ')).toBe(false)
    expect(isOfframpCountryCode('')).toBe(false)
    expect(isOfframpCountryCode(null)).toBe(false)
    expect(isOfframpCountryCode(42)).toBe(false)
  })

  it('falls back to the default country for unusable input', () => {
    expect(getOfframpCountry('GH').code).toBe('GH')
    expect(getOfframpCountry(null).code).toBe(DEFAULT_OFFRAMP_COUNTRY)
    expect(getOfframpCountry('ZZ').code).toBe(DEFAULT_OFFRAMP_COUNTRY)
  })
})

describe('validateAccountNumber', () => {
  it('requires exactly 10 digits for a Nigerian NUBAN', () => {
    expect(validateAccountNumber('NG', '0123456789')).toBeNull()
    expect(validateAccountNumber('NG', '012345678')).toContain('10 digits')
    expect(validateAccountNumber('NG', '01234567890')).toContain('10 digits')
  })

  it('accepts the varying lengths other markets use', () => {
    expect(isValidAccountNumber('GH', '1234567890123')).toBe(true)
    expect(isValidAccountNumber('KE', '01234567890')).toBe(true)
    expect(isValidAccountNumber('ZA', '1234567890')).toBe(true)
    expect(isValidAccountNumber('UG', '1234567890123')).toBe(true)
  })

  it('does not accept a Nigerian-length account everywhere by accident', () => {
    // A 10-digit number is valid in every market here, but the bounds still
    // have to bite at the edges.
    expect(isValidAccountNumber('GH', '1234567')).toBe(false)
    expect(isValidAccountNumber('ZA', '12345')).toBe(false)
    expect(isValidAccountNumber('ZA', '12345678901234')).toBe(false)
    expect(isValidAccountNumber('KE', '12345')).toBe(false)
    expect(isValidAccountNumber('UG', '1234567')).toBe(false)
  })

  it('rejects letters only where the format is numeric', () => {
    expect(validateAccountNumber('NG', '01234A6789')).toContain('digits')
    expect(validateAccountNumber('ZA', '12345A7890')).toContain('digits')
    expect(isValidAccountNumber('KE', 'KE12345678')).toBe(true)
    expect(isValidAccountNumber('UG', 'UG1234567890')).toBe(true)
  })

  it('rejects punctuation and whitespace-only input', () => {
    expect(validateAccountNumber('NG', '')).toBe('Enter your account number.')
    expect(validateAccountNumber('NG', '   ')).toBe('Enter your account number.')
    expect(validateAccountNumber('KE', '0123-4567')).toContain('letters and digits')
  })
})

describe('sanitizeAccountNumber', () => {
  it('strips letters and caps length for numeric-only markets', () => {
    expect(sanitizeAccountNumber('NG', '012-345 678a9')).toBe('0123456789')
    expect(sanitizeAccountNumber('NG', '01234567890123')).toBe('0123456789')
    expect(sanitizeAccountNumber('ZA', '12 34 56 78 90')).toBe('1234567890')
  })

  it('keeps letters, upper-cased, where the market allows them', () => {
    expect(sanitizeAccountNumber('KE', 'ke-123 456')).toBe('KE123456')
    expect(sanitizeAccountNumber('UG', 'ug/1234567890')).toBe('UG1234567890')
  })

  it('never produces a value longer than the field accepts', () => {
    for (const code of OFFRAMP_COUNTRY_CODES) {
      const sanitized = sanitizeAccountNumber(code, '1'.repeat(64))
      expect(sanitized.length).toBe(OFFRAMP_COUNTRIES[code].account.maxLength)
    }
  })
})
