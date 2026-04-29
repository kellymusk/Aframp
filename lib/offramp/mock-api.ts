export interface OfframpOrder {
  id: string
  sourceAsset: string
  sourceAmount: number
  fiatCurrency: string
  fiatAmount: number
  exchangeRate: number
  expiresAt: Date
  bankDetails: {
    bankName: string
    accountNumber: string
    accountName: string
  }
  settlementAddress: string
  memo: string
  fees: {
    offrampFee: number
    networkFee: number
    bankFee: number
    total: number
  }
  status: 'awaiting_crypto' | 'processing' | 'completed' | 'failed'
}

export const MOCK_ORDER: OfframpOrder = {
  id: 'OFF-20260119-A1B2C3',
  sourceAsset: 'cNGN',
  sourceAmount: 50,
  fiatCurrency: 'NGN',
  fiatAmount: 79200,
  exchangeRate: 1584,
  expiresAt: new Date('2026-02-01T12:00:00Z'), // Stable date for hydration
  bankDetails: {
    bankName: 'Access Bank',
    accountNumber: '0123456789',
    accountName: 'CHUKWUEMEKA OKAFOR',
  },
  settlementAddress: 'GAFRAMPSTAGINGWALLETADDRESS...XYZ123',
  memo: 'OFF-20260119-A1B2C3',
  fees: {
    offrampFee: 800,
    networkFee: 15,
    bankFee: 0,
    total: 815,
  },
  status: 'awaiting_crypto',
}

export async function createOfframpOrder(amount: number, _asset: string): Promise<OfframpOrder> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    ...MOCK_ORDER,
    sourceAmount: amount,
    expiresAt: new Date('2026-02-01T12:15:00Z'),
  }
}

export function getExchangeRate(_pair: string): number {
  // specific hardcoded rate requested
  return 1584
}
