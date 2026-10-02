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

/** Pattern that matches `ozow.com` and any subdomain (e.g. `pay.ozow.com`). */
const OZOW_HOSTNAME_PATTERN = /^([\w-]+\.)*ozow\.com$/

/**
 * Validates that a payment URL returned by the Ozow backend is safe to
 * redirect to.  Throws a descriptive `Error` when validation fails so the
 * caller can surface it as a user-facing message.
 *
 * Rules enforced:
 *  1. The URL must be parseable (no `javascript:` pseudo-URLs, etc.).
 *  2. The scheme must be `https:`.
 *  3. The hostname must be `ozow.com` or a subdomain of it.
 */
export function validateOzowPaymentUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid payment URL received from server.')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Payment URL must use HTTPS.')
  }

  if (!OZOW_HOSTNAME_PATTERN.test(parsed.hostname)) {
    throw new Error('Payment URL does not point to a trusted Ozow domain.')
  }
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
