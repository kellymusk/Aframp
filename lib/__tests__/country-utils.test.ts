/**
 * Tests for country-utils.ts
 * Verifies correct BCP-47 locale parsing and country pricing lookup.
 */

import {
  inferCountryFromLocale,
  getCountryPricing,
  countryPricing,
  type CountryCode,
} from '../country-utils'

describe('inferCountryFromLocale', () => {
  describe('simple locales', () => {
    it('parses simple locale like en-KE', () => {
      const result = inferCountryFromLocale('en-KE')
      expect(result.code).toBe('KE')
    })

    it('parses simple locale like en-NG', () => {
      const result = inferCountryFromLocale('en-NG')
      expect(result.code).toBe('NG')
    })

    it('parses locale with region only', () => {
      const result = inferCountryFromLocale('fr-GH')
      expect(result.code).toBe('GH')
    })
  })

  describe('locales with script subtag (BCP-47)', () => {
    it('parses en-Latn-KE correctly (skips script tag)', () => {
      const result = inferCountryFromLocale('en-Latn-KE')
      // Bug fix: previously this would return NG (Nigeria) because split('-')[1] = 'Latn'
      expect(result.code).toBe('KE')
      expect(result.name).toBe('Kenya')
    })

    it('parses en-Latn-NG correctly', () => {
      const result = inferCountryFromLocale('en-Latn-NG')
      expect(result.code).toBe('NG')
    })

    it('parses ar-EG correctly (Arabic script)', () => {
      const result = inferCountryFromLocale('ar-EG')
      expect(result.code).toBe('NG') // Falls back to NG
    })

    it('parses en-Latn-ZA correctly', () => {
      const result = inferCountryFromLocale('en-Latn-ZA')
      expect(result.code).toBe('ZA')
    })

    it('parses sw-TZ correctly (Swahili Tanzania)', () => {
      const result = inferCountryFromLocale('sw-TZ')
      expect(result.code).toBe('TZ')
    })
  })

  describe('array of locales', () => {
    it('uses first matching locale', () => {
      const result = inferCountryFromLocale(['fr-FR', 'en-KE', 'de-DE'])
      expect(result.code).toBe('KE')
    })

    it('falls through to second locale if first does not match', () => {
      const result = inferCountryFromLocale(['en-US', 'en-KE'])
      expect(result.code).toBe('KE')
    })

    it('handles script-tagged locales in arrays', () => {
      const result = inferCountryFromLocale(['en-US', 'en-Latn-KE', 'de-DE'])
      expect(result.code).toBe('KE')
    })
  })

  describe('fallback behavior', () => {
    it('falls back to Nigeria for unknown locales', () => {
      const result = inferCountryFromLocale('xx-XX')
      expect(result.code).toBe('NG')
    })

    it('falls back to Nigeria for language-only locales', () => {
      const result = inferCountryFromLocale('en')
      expect(result.code).toBe('NG')
    })

    it('falls back to Nigeria for invalid input', () => {
      const result = inferCountryFromLocale([])
      expect(result.code).toBe('NG')
    })
  })
})

describe('countryPricing', () => {
  it('contains Nigeria configuration', () => {
    const nigeria = countryPricing.find((c) => c.code === 'NG')
    expect(nigeria).toBeDefined()
    expect(nigeria!.feePercentage).toBe(1.5)
  })

  it('contains Kenya configuration', () => {
    const kenya = countryPricing.find((c) => c.code === 'KE')
    expect(kenya).toBeDefined()
    expect(kenya!.feePercentage).toBe(0.5)
  })

  it('maps KE locale region correctly', () => {
    const kenya = countryPricing.find((c) => c.localeRegions.includes('KE'))
    expect(kenya!.code).toBe('KE')
  })
})

describe('getCountryPricing', () => {
  it('returns pricing for valid country code', () => {
    const pricing = getCountryPricing('KE')
    expect(pricing?.code).toBe('KE')
    expect(pricing?.feePercentage).toBe(0.5)
  })

  it('returns undefined for invalid country code', () => {
    const pricing = getCountryPricing('XX' as CountryCode)
    expect(pricing).toBeUndefined()
  })
})