import type { FiatCurrency } from "@/types/onramp"
import { formatCurrency } from "@/lib/onramp/formatters"

const limitsMap: Record<FiatCurrency, { min: number; max: number }> = {
  NGN: { min: 1000, max: 500000 },
  KES: { min: 100, max: 50000 },
  GHS: { min: 10, max: 5000 },
  ZAR: { min: 20, max: 80000 },
  UGX: { min: 2000, max: 1000000 },
}

export function getLimits(currency: FiatCurrency) {
  return limitsMap[currency]
}

export function validateAmount(amount: number, currency: FiatCurrency) {
  const { min, max } = limitsMap[currency]
  if (!amount || amount <= 0) {
    return "Enter an amount to continue."
  }
  if (amount < min) {
    return `Minimum amount is ${formatCurrency(min, currency, 0)}.`
  }
  if (amount > max) {
    return `Maximum amount is ${formatCurrency(max, currency, 0)}.`
  }
  return ""
}

export function isValidStellarAddress(address: string) {
  if (!address) return false
  return /^G[A-Z2-7]{55}$/.test(address)
}
