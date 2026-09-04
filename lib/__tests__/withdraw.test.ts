import {
  getBankOptions,
  getWithdrawableAssets,
  getWithdrawalAssetConfig,
  WITHDRAWAL_ASSETS,
  WITHDRAWAL_ASSET_CONFIG,
} from '@/lib/withdraw'
import type { Balance } from '@/lib/api'

function balance(asset: string, available: bigint): Balance {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

describe('WITHDRAWAL_ASSET_CONFIG', () => {
  it('defines cNGN, cKES and cGHS with distinct minimums', () => {
    expect(WITHDRAWAL_ASSETS).toEqual(['cNGN', 'cKES', 'cGHS'])
    const minimums = WITHDRAWAL_ASSETS.map((asset) => WITHDRAWAL_ASSET_CONFIG[asset].minimumStroops)
    expect(new Set(minimums).size).toBe(3)
  })

  it('maps each asset to the correct country', () => {
    expect(getWithdrawalAssetConfig('cNGN').country).toBe('Nigeria')
    expect(getWithdrawalAssetConfig('cKES').country).toBe('Kenya')
    expect(getWithdrawalAssetConfig('cGHS').country).toBe('Ghana')
  })
})

describe('getBankOptions', () => {
  it('filters banks to the selected asset country', () => {
    expect(getBankOptions('cNGN')[0].name).toBe('Access Bank')
    expect(getBankOptions('cKES')[0].name).toBe('M-PESA')
    expect(getBankOptions('cGHS')[0].name).toBe('MTN Mobile Money')
  })
})

describe('getWithdrawableAssets', () => {
  it('returns only non-zero withdrawal balances in canonical order', () => {
    const balances = [
      balance('XLM', 100n),
      balance('cGHS', 500n),
      balance('cNGN', 0n),
      balance('cKES', 10n),
    ]
    expect(getWithdrawableAssets(balances)).toEqual(['cKES', 'cGHS'])
  })

  it('returns empty when no withdrawal asset has a balance', () => {
    expect(getWithdrawableAssets([balance('XLM', 100n), balance('cNGN', 0n)])).toEqual([])
  })
})
