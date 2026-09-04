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
