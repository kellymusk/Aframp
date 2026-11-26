export type FiatCurrency = 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'UGX'

/**
 * Assets accepted on **both** rails — onramp (fiat → crypto) and offramp
 * (crypto → fiat). Both rail unions are composed from this base so the two
 * can't drift apart silently: adding an asset to either rail forces a
 * decision about the other, and `types/__tests__/assets.test.ts` asserts the
 * documented overlap (cNGN, USDC, XLM) still holds (#1178).
 */
export type CrossRailAsset = 'cNGN' | 'USDC' | 'XLM'

/**
 * Crypto assets the onramp can mint for fiat.
 *
 * Per-rail support intentionally differs (#1178):
 * - shared with the offramp: cNGN, USDC, XLM (see `CrossRailAsset`);
 * - onramp-only: cKES and cGHS — fiat-backed wrappers that are minted on
 *   deposit but have no cash-out rail yet, so they can never be cashed out.
 */
export type CryptoAsset = CrossRailAsset | 'cKES' | 'cGHS'

export type PaymentMethod = 'bank_transfer' | 'card' | 'mobile_money'
export type OrderStatus =
  | 'created'
  | 'awaiting_payment'
  | 'payment_received'
  | 'minting'
  | 'transferring'
  | 'completed'
  | 'failed'

export interface ExchangeRateResult {
  fiat: FiatCurrency
  asset: CryptoAsset
  rate: number
  lastUpdated: number
  source: 'coingecko' | 'cache'
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
  /** Fiat amount the user is converting, in whole currency units (e.g. 1_000 = ₦1,000). */
  amount: number
  exchangeRate: number
  /** Crypto amount minted, in whole asset units — `amount × exchangeRate`. */
  cryptoAmount: number
  fees: FeeBreakdown
  walletAddress: string
  status: OrderStatus
  transactionHash?: string
  completedAt?: number
  referralCode?: string
}

/**
 * One row in a rendered transaction list. Unlike the order records, amounts
 * here are **preformatted display strings** (e.g. '₦1,000.00' / '25 USDC')
 * derived from the numeric order fields — `fromAmount` from `OnrampOrder.amount`,
 * `toAmount` from `OnrampOrder.cryptoAmount` (#1179). Keep them display-only:
 * never parse them back for arithmetic or rates.
 */
export interface TransactionItem {
  id: string
  /** Formatted fiat amount sent (from `OnrampOrder.amount`). */
  fromAmount: string
  /** Formatted crypto amount received (from `OnrampOrder.cryptoAmount`). */
  toAmount: string
  /**
   * Lowercase snake_case to match `OrderStatus` conventions (#1179); map to
   * display copy at render time. 'pending' has no `OrderStatus` counterpart —
   * an in-flight order sits at 'awaiting_payment', but a rendered row only
   * distinguishes completed / pending / failed.
   */
  status: 'completed' | 'pending' | 'failed'
  timeLabel: string
}
