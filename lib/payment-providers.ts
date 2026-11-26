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

export const PROVIDER_CONFIGS: Record<PaymentProvider, ProviderConfig> = {
  paystack: {
    name: 'Paystack',
    currency: 'NGN',
    feePercentage: 0.029, // 2.9%
    fixedFee: 1, // NGN 1
    vat: 0.15, // 15% VAT
    minAmount: 50,
    maxAmount: 5000000,
    methods: ['bank_transfer', 'card'],
  },
  flutterwave: {
    name: 'Flutterwave',
    currency: 'KES',
    feePercentage: 0.034, // 3.4%
    fixedFee: 0,
    vat: 0,
    minAmount: 100,
    maxAmount: 10000000,
    methods: ['bank_transfer', 'card', 'mobile_money'],
  },
  ozow: {
    name: 'Ozow',
    currency: 'ZAR',
    feePercentage: 0.015, // 1.5%
    fixedFee: 0,
    vat: 0,
    minAmount: 10,
    maxAmount: 500000,
    methods: ['instant_eft'],
  },
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

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

function calculatePercentageInMinorUnits(amountMinor: number, rateBasisPoints: number): number {
  return Math.floor((amountMinor * rateBasisPoints + 5000) / 10000)
}

/**
 * Return an amount validation message, or null when it is within provider limits.
 */
export function getAmountValidationError(amount: number, provider: PaymentProvider): string | null {
  const config = PROVIDER_CONFIGS[provider]

  if (!Number.isFinite(amount)) {
    return 'Amount must be a valid number.'
  }

  const amountMinor = toMinorUnits(amount)
  if (amountMinor < toMinorUnits(config.minAmount)) {
    return `Minimum amount is ${formatCurrency(config.minAmount, config.currency)}.`
  }
  if (amountMinor > toMinorUnits(config.maxAmount)) {
    return `Maximum amount is ${formatCurrency(config.maxAmount, config.currency)}.`
  }

  return null
}

/**
 * Calculate fees for a given amount and provider
 */
export function calculateFees(
  amount: number,
  provider: PaymentProvider
): {
  processingFee: number
  vat: number
  totalFees: number
  totalCost: number
} {
  const config = PROVIDER_CONFIGS[provider]
  const validationError = getAmountValidationError(amount, provider)
  if (validationError) {
    throw new RangeError(validationError)
  }

  const amountMinor = toMinorUnits(amount)
  const feeRateBasisPoints = Math.round(config.feePercentage * 10000)
  const vatRateBasisPoints = Math.round(config.vat * 10000)
  const processingFeeMinor =
    calculatePercentageInMinorUnits(amountMinor, feeRateBasisPoints) + toMinorUnits(config.fixedFee)
  const vatMinor = calculatePercentageInMinorUnits(processingFeeMinor, vatRateBasisPoints)
  const totalFeesMinor = processingFeeMinor + vatMinor
  const totalCostMinor = amountMinor + totalFeesMinor

  return {
    processingFee: processingFeeMinor / 100,
    vat: vatMinor / 100,
    totalFees: totalFeesMinor / 100,
    totalCost: totalCostMinor / 100,
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
