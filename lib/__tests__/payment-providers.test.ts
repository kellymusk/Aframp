import {
  PROVIDER_CONFIGS,
  calculateFees,
  getProviderConfig,
  getProviderForCurrency,
} from '../payment-providers'
import type { FiatCurrency } from '@/types/onramp'

const ALL: FiatCurrency[] = ['NGN', 'KES', 'GHS', 'ZAR', 'UGX']

describe('getProviderForCurrency', () => {
  it.each([
    ['NGN', 'paystack'],
    ['ZAR', 'ozow'],
    ['KES', 'flutterwave'],
    ['GHS', 'flutterwave'],
    ['UGX', 'flutterwave'],
  ])('%s -> %s', (currency, provider) => {
    expect(getProviderForCurrency(currency as FiatCurrency)).toBe(provider)
  })

  it('returns null for unsupported currency', () => {
    expect(getProviderForCurrency('USD' as FiatCurrency)).toBeNull()
  })
})

describe('provider configs', () => {
  it.each(ALL)('%s has a config whose currency matches', (currency) => {
    const provider = getProviderForCurrency(currency)!
    const config = getProviderConfig(provider, currency)
    expect(config).not.toBeNull()
    expect(config!.currency).toBe(currency)
    expect(config!.minAmount).toBeLessThan(config!.maxAmount)
  })

  it('returns null for unsupported pairs', () => {
    expect(getProviderConfig('paystack', 'GHS')).toBeNull()
    expect(PROVIDER_CONFIGS.ozow.KES).toBeUndefined()
  })
})

describe('calculateFees', () => {
  it('applies Paystack NGN fees with VAT', () => {
    expect(calculateFees(1000, 'paystack', 'NGN')).toEqual({
      processingFee: 30,
      vat: 4.5,
      totalFees: 34.5,
      totalCost: 1034.5,
    })
  })

  it('defaults currency to the provider primary currency', () => {
    expect(calculateFees(1000, 'ozow')).toEqual(calculateFees(1000, 'ozow', 'ZAR'))
    expect(calculateFees(1000, 'ozow').processingFee).toBe(15)
  })

  it.each(['KES', 'GHS', 'UGX'] as const)('uses the %s schedule for flutterwave', (currency) => {
    const cfg = getProviderConfig('flutterwave', currency)!
    const fees = calculateFees(1000, 'flutterwave', currency)
    expect(fees.processingFee).toBeCloseTo(1000 * cfg.feePercentage + cfg.fixedFee, 2)
    expect(fees.totalCost).toBeCloseTo(1000 + fees.totalFees, 2)
  })

  it('GHS no longer uses the KES rate', () => {
    expect(calculateFees(1000, 'flutterwave', 'GHS').processingFee).not.toBe(
      calculateFees(1000, 'flutterwave', 'KES').processingFee
    )
  })

  it('throws for unsupported provider/currency pair', () => {
    expect(() => calculateFees(100, 'paystack', 'GHS')).toThrow(/does not support/)
  })
})
