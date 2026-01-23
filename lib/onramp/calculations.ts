import type { FiatCurrency, PaymentMethod } from "@/types/onramp"

const networkFeeMap: Record<FiatCurrency, number> = {
  NGN: 0.15,
  KES: 0.5,
  GHS: 0.05,
  ZAR: 0.1,
  UGX: 10,
}

export function calculateProcessingFee(amount: number, method: PaymentMethod) {
  if (!amount || amount <= 0) return 0
  switch (method) {
    case "card":
      return amount * 0.015
    case "mobile_money":
      return amount * 0.005
    default:
      return 0
  }
}

export function calculateNetworkFee(currency: FiatCurrency) {
  return networkFeeMap[currency]
}

export function calculateCryptoAmount(amount: number, rate: number) {
  if (!amount || amount <= 0 || !rate || rate <= 0) return 0
  return amount * rate
}

export function calculateFeeBreakdown(amount: number, currency: FiatCurrency, method: PaymentMethod) {
  const processingFee = calculateProcessingFee(amount, method)
  const networkFee = calculateNetworkFee(currency)
  const totalFees = processingFee + networkFee
  const totalCost = amount + totalFees

  return {
    processingFee,
    networkFee,
    totalFees,
    totalCost,
  }
}
