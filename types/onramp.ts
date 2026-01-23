export type FiatCurrency = "NGN" | "KES" | "GHS" | "ZAR" | "UGX"
export type CryptoAsset = "cNGN" | "cKES" | "cGHS" | "USDC" | "XLM"
export type PaymentMethod = "bank_transfer" | "card" | "mobile_money"

export interface ExchangeRateResult {
  fiat: FiatCurrency
  asset: CryptoAsset
  rate: number
  lastUpdated: number
  source: "coingecko" | "cache"
}

export interface ExchangeRateState {
  data: ExchangeRateResult | null
  isLoading: boolean
  error: string | null
  countdown: number
  warning: string | null
}

export interface FeeBreakdown {
  processingFee: number
  networkFee: number
  totalFees: number
  totalCost: number
}

export interface OnrampFormState {
  amountInput: string
  fiatCurrency: FiatCurrency
  cryptoAsset: CryptoAsset
  paymentMethod: PaymentMethod
}

export interface OnrampOrder {
  id: string
  createdAt: number
  expiresAt: number
  fiatCurrency: FiatCurrency
  cryptoAsset: CryptoAsset
  paymentMethod: PaymentMethod
  amount: number
  exchangeRate: number
  cryptoAmount: number
  fees: FeeBreakdown
  walletAddress: string
}

export interface TransactionItem {
  id: string
  fromAmount: string
  toAmount: string
  status: "Completed" | "Pending" | "Failed"
  timeLabel: string
}
