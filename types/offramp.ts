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

export type OfframpOrderStatus = 'pending_bank_details' | 'pending' | 'processing' | 'completed' | 'failed'

export interface OfframpOrder {
  id: string
  createdAt: number
  /** Wallet the order belongs to — the key it is persisted under server-side. */
  walletAddress: string
  lockExpiresAt: number
  assetId: string
  asset: OfframpAsset
  chain: OfframpChain
  amount: number
  fiatCurrency: FiatCurrency
  rate: number
  fiatAmount: number
  fees: OfframpFeeBreakdown
  status: OfframpOrderStatus
  bankCode?: string
  accountNumber?: string
  /** Set once the payout provider confirms the transfer — the terminal-state summary amount. */
  payoutAmount?: number
  /** Provider payout reference, shown to the user for their own records/support tickets. */
  payoutReference?: string
  /** Human-readable reason set only when status is 'failed'. */
  failureReason?: string
}

/** Field labels differ per payout rail even though the shape (code + account/number) is shared. */
export interface OfframpBankDetailsFieldConfig {
  showBankSelect: boolean
  accountLabel: string
  accountPlaceholder: string
  /** Digit count to validate against, or null when the rail has no fixed length (e.g. mobile money). */
  accountLength: number | null
}

export const OFFRAMP_BANK_DETAILS_FIELDS: Record<FiatCurrency, OfframpBankDetailsFieldConfig> = {
  NGN: {
    showBankSelect: true,
    accountLabel: 'Account number',
    accountPlaceholder: '0123456789',
    accountLength: 10,
  },
  KES: {
    showBankSelect: false,
    accountLabel: 'M-PESA phone number',
    accountPlaceholder: '0712345678',
    accountLength: null,
  },
  GHS: {
    showBankSelect: false,
    accountLabel: 'MTN MoMo number',
    accountPlaceholder: '0244123456',
    accountLength: null,
  },
  ZAR: {
    showBankSelect: true,
    accountLabel: 'Account number',
    accountPlaceholder: '1234567890',
    accountLength: null,
  },
  UGX: {
    showBankSelect: false,
    accountLabel: 'Mobile money number',
    accountPlaceholder: '0712345678',
    accountLength: null,
  },
}
