import type { OfframpAsset, OfframpChain } from '@/types/offramp'

export interface OfframpAssetConfig {
  id: string
  asset: OfframpAsset
  chain: OfframpChain
  label: string
  icon: string
}

/**
 * STOPGAP: mirrors lib/banks.ts — the backend has no `/offramp/assets`
 * listing endpoint yet, so the supported asset/chain pairs are hardcoded
 * here until one exists.
 */
export const OFFRAMP_ASSETS: OfframpAssetConfig[] = [
  { id: 'cngn-stellar', asset: 'cNGN', chain: 'Stellar', label: 'cNGN', icon: '🇳🇬' },
  { id: 'usdc-stellar', asset: 'USDC', chain: 'Stellar', label: 'USDC (Stellar)', icon: '💵' },
  { id: 'usdc-base', asset: 'USDC', chain: 'Base', label: 'USDC (Base)', icon: '💵' },
  { id: 'usdt-ethereum', asset: 'USDT', chain: 'Ethereum', label: 'USDT (Ethereum)', icon: '💵' },
  { id: 'xlm-stellar', asset: 'XLM', chain: 'Stellar', label: 'XLM', icon: '⭐' },
]
