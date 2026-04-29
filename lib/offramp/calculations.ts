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
  return {
    min: currency === 'NGN' ? 5000 : 5000,
    max: currency === 'NGN' ? 5000000 : 5000000,
  }
}
