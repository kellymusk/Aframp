import type { FiatCurrency } from '@/types/onramp'

export type OfframpChain = 'Stellar' | 'Ethereum' | 'Polygon' | 'Base'
export type OfframpAsset = 'cNGN' | 'USDC' | 'USDT' | 'XLM'

export interface OfframpAssetOption {
  id: string
  asset: OfframpAsset
  chain: OfframpChain
  label: string
  balance: number
  icon: string
}

export interface OfframpRateState {
  rate: number
  lastUpdated: number
  countdown: number
  isLoading: boolean
}

export interface OfframpFormState {
  assetId: string
  amountInput: string
  fiatCurrency: FiatCurrency
}

export interface OfframpFeeBreakdown {
  offrampFee: number
  networkFee: number
  bankFee: number
  totalFees: number
  receiveAmount: number
}

export interface OfframpOrder {
  id: string
  createdAt: number
  lockExpiresAt: number
  assetId: string
  asset: OfframpAsset
  chain: OfframpChain
  amount: number
  fiatCurrency: FiatCurrency
  rate: number
  fiatAmount: number
  fees: OfframpFeeBreakdown
  status: 'pending_bank_details'
}
