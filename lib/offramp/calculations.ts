import type { FiatCurrency } from '@/types/onramp'
import type { OfframpFeeBreakdown } from '@/types/offramp'

const networkFeeMap: Record<string, number> = {
  Stellar: 15,
  Ethereum: 1500,
  Polygon: 120,
  Base: 200,
}

export function calculateFiatAmount(amount: number, rate: number) {
  if (!amount || amount <= 0) return 0
  return amount * rate
}

export function calculateFees(
  fiatAmount: number,
  chain: string,
  offrampFeeRate = 0.01
): OfframpFeeBreakdown {
  const offrampFee = fiatAmount * offrampFeeRate
  const networkFee = networkFeeMap[chain] ?? 15
  const bankFee = 0
  const totalFees = offrampFee + networkFee + bankFee
  const receiveAmount = Math.max(fiatAmount - totalFees, 0)

  return {
    offrampFee,
    networkFee,
    bankFee,
    totalFees,
    receiveAmount,
  }
}

export function getMinMax(currency: FiatCurrency) {
  const limits: Record<FiatCurrency, { min: number; max: number }> = {
    NGN: { min: 5_000, max: 5_000_000 },
    KES: { min: 500, max: 500_000 },
    GHS: { min: 50, max: 50_000 },
    ZAR: { min: 100, max: 100_000 },
    UGX: { min: 20_000, max: 20_000_000 },
  }
  return limits[currency]
}
