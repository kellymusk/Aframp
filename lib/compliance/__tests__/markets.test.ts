/**
 * Market resolution, FX normalisation and payer identity.
 *
 * These are small functions guarding a large assumption: that every rule
 * downstream is comparing like with like.  A currency that resolves to the
 * wrong market, or an amount converted with the wrong scale, does not fail
 * loudly — it produces a screening record that looks correct and measures the
 * transaction against thresholds meant for somewhere else.  So the cases here
 * are mostly about what must *not* be silently accepted.
 */

import { CURRENCY_MARKETS, JURISDICTIONS, UNLICENSED_MARKET_POLICY } from '../config'
import { payerIdentity } from '../identity'
import {
  isLicensedJurisdiction,
  policyFor,
  resolveMarket,
  toUsdCents,
  UnsupportedMarketError,
} from '../markets'
import type { Market } from '../types'

describe('resolveMarket', () => {
  it('maps each licensed market currency to its jurisdiction', () => {
    expect(resolveMarket('NGN')).toBe('NG')
    expect(resolveMarket('KES')).toBe('KE')
    expect(resolveMarket('GHS')).toBe('GH')
    expect(resolveMarket('ZAR')).toBe('ZA')
    expect(resolveMarket('UGX')).toBe('UG')
  })

  it('maps mobile-money currencies outside the licensed footprint', () => {
    expect(resolveMarket('TZS')).toBe('TZ')
    expect(resolveMarket('RWF')).toBe('RW')
    expect(resolveMarket('ZMW')).toBe('ZM')
  })

  it('accepts lowercase and padded input', () => {
    expect(resolveMarket('  kes ')).toBe('KE')
  })

  it('refuses an unmapped currency rather than guessing a market', () => {
    // The alternative — defaulting to some market — would produce a case file
    // asserting a jurisdiction the transaction never touched.
    expect(() => resolveMarket('EUR')).toThrow(UnsupportedMarketError)
    expect(() => resolveMarket('')).toThrow(UnsupportedMarketError)
  })

  it('carries the offending currency on the error so the route can report it', () => {
    expect(() => resolveMarket('EUR')).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_MARKET', currency: 'EUR' })
    )
  })
})

describe('policyFor', () => {
  it('returns the statutory policy for a licensed market', () => {
    expect(policyFor('NG')).toBe(JURISDICTIONS.NG)
    expect(policyFor('KE').regulator).toBe('FRC')
  })

  it('falls back to the unlicensed policy rather than throwing', () => {
    // Rules call this mid-screening.  Throwing here would surface to the route
    // as "engine broken", indistinguishable from a real fault, and the
    // transaction would end up unscreened either way.
    expect(policyFor('TZ')).toBe(UNLICENSED_MARKET_POLICY)
    expect(policyFor('TZ').licensed).toBe(false)
  })

  it('anchors the unlicensed threshold to the lowest licensed one', () => {
    const lowest = Math.min(
      ...Object.values(JURISDICTIONS).map((p) => p.reportingThresholdCents)
    )
    expect(UNLICENSED_MARKET_POLICY.reportingThresholdCents).toBe(lowest)
  })

  it('resolves a policy for every currency the payment routes accept', () => {
    // A currency in the table with no reachable policy would throw inside a
    // velocity rule at screening time.
    for (const market of Object.values(CURRENCY_MARKETS)) {
      expect(policyFor(market).reportingThresholdCents).toBeGreaterThan(0)
    }
  })
})

describe('isLicensedJurisdiction', () => {
  it('separates filing routes from screening-only markets', () => {
    expect(isLicensedJurisdiction('ZA')).toBe(true)
    expect(isLicensedJurisdiction('CI')).toBe(false)
  })

  it('agrees with the licensed flag on the policy', () => {
    for (const market of Object.values(CURRENCY_MARKETS) as Market[]) {
      expect(isLicensedJurisdiction(market)).toBe(policyFor(market).licensed)
    }
  })
})

describe('toUsdCents', () => {
  it('converts local major units to USD cents', () => {
    // 1,000,000 NGN at 0.066 cents per naira ≈ $660.
    expect(toUsdCents(1_000_000, 'NGN')).toBe(66_000)
    expect(toUsdCents(100, 'USD')).toBe(10_000)
  })

  it('rounds to whole cents', () => {
    expect(Number.isInteger(toUsdCents(1234.56, 'KES'))).toBe(true)
  })

  it('is case- and whitespace-insensitive, matching resolveMarket', () => {
    expect(toUsdCents(100, ' kes ')).toBe(toUsdCents(100, 'KES'))
  })

  it('refuses a currency it has no rate for', () => {
    expect(() => toUsdCents(100, 'EUR')).toThrow(UnsupportedMarketError)
  })

  it('rejects non-positive and non-finite amounts', () => {
    // Zero and NaN would sail past every threshold as an unremarkable
    // transaction rather than being caught as bad input.
    expect(() => toUsdCents(0, 'NGN')).toThrow(RangeError)
    expect(() => toUsdCents(-5, 'NGN')).toThrow(RangeError)
    expect(() => toUsdCents(Number.NaN, 'NGN')).toThrow(RangeError)
    expect(() => toUsdCents(Number.POSITIVE_INFINITY, 'NGN')).toThrow(RangeError)
  })

  it('has a rate for every currency it will be asked to convert', () => {
    for (const currency of Object.keys(CURRENCY_MARKETS)) {
      expect(() => toUsdCents(1000, currency)).not.toThrow()
    }
  })
})

describe('payerIdentity', () => {
  const SALT = 'test-salt'
  let previousSalt: string | undefined

  beforeAll(() => {
    previousSalt = process.env.COMPLIANCE_HASH_SALT
    process.env.COMPLIANCE_HASH_SALT = SALT
  })

  afterAll(() => {
    process.env.COMPLIANCE_HASH_SALT = previousSalt
  })

  it('is stable for the same payer, so velocity rules accumulate', () => {
    // The whole point: two payments from one handset must key to one account.
    expect(payerIdentity('msisdn', '+254712345678')).toBe(
      payerIdentity('msisdn', '+254712345678')
    )
  })

  it('normalises formatting differences in a phone number', () => {
    expect(payerIdentity('msisdn', '+254 712 345 678')).toBe(
      payerIdentity('msisdn', '+254712345678')
    )
  })

  it('normalises case in an email address', () => {
    expect(payerIdentity('email', 'Ada@Example.COM ')).toBe(payerIdentity('email', 'ada@example.com'))
  })

  it('does not collide across instruments', () => {
    expect(payerIdentity('msisdn', 'same-value')).not.toBe(payerIdentity('email', 'same-value'))
  })

  it('distinguishes different payers', () => {
    expect(payerIdentity('msisdn', '+254712345678')).not.toBe(
      payerIdentity('msisdn', '+254712345679')
    )
  })

  it('does not leak the raw identifier', () => {
    // This id lands in the ledger and on case files; a phone number in it
    // would defeat the pseudonymisation hashCounterparty() exists to provide.
    const id = payerIdentity('msisdn', '+254712345678')
    expect(id).not.toContain('254712345678')
    expect(id).toMatch(/^msisdn:[0-9a-f]{64}$/)
  })

  it('throws without a salt rather than hashing unsalted', () => {
    delete process.env.COMPLIANCE_HASH_SALT
    expect(() => payerIdentity('email', 'ada@example.com')).toThrow(/COMPLIANCE_HASH_SALT/)
    process.env.COMPLIANCE_HASH_SALT = SALT
  })
})
