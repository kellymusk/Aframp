import type { CryptoAsset } from '@/types/onramp'

/**
 * Display metadata for the Stellar assets the platform actually transacts.
 *
 * The set is deliberately narrower than `CryptoAsset` in types/onramp.ts:
 * USDC has no configured issuer, so the charge page can't emit a SEP-0007
 * URI for it (see app/(app)/charge/page.tsx) and it isn't settled anywhere.
 * XLM is the native asset used for charges and remittances; cNGN, cKES and
 * cGHS are the fiat-backed stablecoins with a cash-out route — the same set
 * as WITHDRAWAL_ASSETS in lib/withdraw.ts.
 */
export interface StellarAssetInfo {
  code: CryptoAsset
  name: string
  icon: string
  color: string
}

export const STELLAR_ASSETS: StellarAssetInfo[] = [
  {
    code: 'XLM',
    name: 'Stellar Lumens',
    icon: '✦',
    color: '#7C3AED',
  },
  {
    code: 'cNGN',
    name: 'Celo Nigerian Naira',
    icon: '₦',
    color: '#008751',
  },
  {
    code: 'cKES',
    name: 'Celo Kenyan Shilling',
    icon: 'K',
    color: '#BB0000',
  },
  {
    code: 'cGHS',
    name: 'Celo Ghanaian Cedi',
    icon: '₵',
    color: '#CE1126',
  },
]
