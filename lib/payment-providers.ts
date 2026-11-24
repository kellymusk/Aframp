/**
 * Payment provider configurations and fee calculations
 */

import type { FiatCurrency } from '@/types/onramp'

export type PaymentProvider = 'paystack' | 'flutterwave' | 'ozow'

export interface ProviderConfig {
  name: string
  currency: FiatCurrency
  feePercentage: number
  fixedFee: number
  vat: number
  minAmount: number
  maxAmount: number
  methods: Array<'bank_transfer' | 'card' | 'mobile_money' | 'instant_eft'>
}

/**
 * Provider configs are modelled per (provider, currency) because a provider
 * (e.g. Flutterwave) can serve several currencies with different fee schedules.
 *
 * NOTE: GHS/UGX fee rates and bounds below are estimates and must be verified
 * against the current Flutterwave rate card before go-live.
 */
export const PROVIDER_CONFIGS: Record<
  PaymentProvider,
  Partial<Record<FiatCurrency, ProviderConfig>>
> = {
  paystack: {
    NGN: {
      name: 'Paystack',
      currency: 'NGN',
      feePercentage: 0.029, // 2.9%
      fixedFee: 1, // NGN 1
      vat: 0.15, // 15% VAT
      minAmount: 50,
      maxAmount: 5000000,
      methods: ['bank_transfer', 'card'],
    },
  },
  flutterwave: {
    KES: {
      name: 'Flutterwave',
      currency: 'KES',
      feePercentage: 0.034, // 3.4%
      fixedFee: 0,
      vat: 0,
      minAmount: 100,
      maxAmount: 10000000,
      methods: ['bank_transfer', 'card', 'mobile_money'],
    },
    GHS: {
      name: 'Flutterwave',
      currency: 'GHS',
      feePercentage: 0.029, // 2.9%
      fixedFee: 0,
      vat: 0,
      minAmount: 1,
      maxAmount: 100000,
      methods: ['card', 'mobile_money'],
    },
    UGX: {
      name: 'Flutterwave',
      currency: 'UGX',
      feePercentage: 0.035, // 3.5%
      fixedFee: 0,
      vat: 0,
      minAmount: 500,
      maxAmount: 50000000,
      methods: ['card', 'mobile_money'],
    },
  },
  ozow: {
    ZAR: {
      name: 'Ozow',
      currency: 'ZAR',
      feePercentage: 0.015, // 1.5%
      fixedFee: 0,
      vat: 0,
      minAmount: 10,
      maxAmount: 500000,
      methods: ['instant_eft'],
    },
  },
}

/**
 * Get the config for a provider/currency pair, or null if unsupported
 */
export function getProviderConfig(
  provider: PaymentProvider,
  currency: FiatCurrency
): ProviderConfig | null {
  return PROVIDER_CONFIGS[provider][currency] ?? null
}

/**
 * Get the appropriate provider for a given currency
 */
export function getProviderForCurrency(currency: FiatCurrency): PaymentProvider | null {
  switch (currency) {
    case 'NGN':
      return 'paystack'
    case 'ZAR':
      return 'ozow'
    case 'KES':
    case 'GHS':
    case 'UGX':
      return 'flutterwave'
    default:
      return null
  }
}

/**
 * Calculate fees for a given amount and provider
 */
export function calculateFees(
  amount: number,
  provider: PaymentProvider,
  currency?: FiatCurrency
): {
  processingFee: number
  vat: number
  totalFees: number
  totalCost: number
} {
  const resolvedCurrency =
    currency ?? (Object.keys(PROVIDER_CONFIGS[provider])[0] as FiatCurrency)
  const config = getProviderConfig(provider, resolvedCurrency)
  if (!config) {
    throw new Error(`Provider ${provider} does not support currency ${resolvedCurrency}`)
  }

  const processingFee = amount * config.feePercentage + config.fixedFee
  const vat = processingFee * config.vat
  const totalFees = processingFee + vat
  const totalCost = amount + totalFees

  return {
    processingFee: Math.round(processingFee * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  }
}

/**
 * Format currency with proper symbols
 */
export function formatCurrency(amount: number, currency: FiatCurrency): string {
  const symbols: Record<FiatCurrency, string> = {
    NGN: '₦',
    KES: 'KSh',
    GHS: 'GH₵',
    ZAR: 'R',
    UGX: 'USh',
  }

  const symbol = symbols[currency] || currency
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Supported South African banks for Ozow
 */
export const OZOW_BANKS = [
  { code: 'FNB', name: 'First National Bank (FNB)' },
  { code: 'ABSA', name: 'Absa Bank' },
  { code: 'NEDBANK', name: 'Nedbank' },
  { code: 'STANDARD', name: 'Standard Bank' },
  { code: 'CAPITEC', name: 'Capitec Bank' },
  { code: 'DISCOVERY', name: 'Discovery Bank' },
  { code: 'INVESTEC', name: 'Investec' },
  { code: 'BIDVEST', name: 'Bidvest Bank' },
  { code: 'TYME', name: 'TymeBank' },
]
