import type { OfframpAsset } from '@/types/offramp'
import type { CryptoAsset, TransactionItem } from '@/types/onramp'

describe('per-rail asset unions (#1178)', () => {
  // Runtime copies of the unions. Each literal is checked against its union
  // at compile time, so a member that drifts out of the type fails `tsc`,
  // while the assertions below fail jest if the documented sets change
  // without the overlap being revisited.
  const cryptoAssets: readonly CryptoAsset[] = ['cNGN', 'cKES', 'cGHS', 'USDC', 'XLM']
  const offrampAssets: readonly OfframpAsset[] = ['cNGN', 'USDC', 'USDT', 'XLM']

  it('accepts the documented overlap (cNGN, USDC, XLM) on both rails', () => {
    const overlap = cryptoAssets.filter((asset) =>
      (offrampAssets as readonly string[]).includes(asset)
    )
    expect(overlap).toEqual(['cNGN', 'USDC', 'XLM'])
  })

  it('keeps the onramp-only members (cKES, cGHS) off the offramp', () => {
    const onrampOnly = cryptoAssets.filter(
      (asset) => !(offrampAssets as readonly string[]).includes(asset)
    )
    expect(onrampOnly).toEqual(['cKES', 'cGHS'])
  })

  it('keeps the offramp-only member (USDT) off the onramp', () => {
    const offrampOnly = offrampAssets.filter(
      (asset) => !(cryptoAssets as readonly string[]).includes(asset)
    )
    expect(offrampOnly).toEqual(['USDT'])
  })
})

describe('TransactionItem.status casing (#1179)', () => {
  it('stays lowercase snake_case like OrderStatus', () => {
    const statuses: readonly TransactionItem['status'][] = ['completed', 'pending', 'failed']
    expect(statuses).toHaveLength(3)
    for (const status of statuses) {
      expect(status).toBe(status.toLowerCase())
      expect(status).not.toMatch(/[A-Z ]/)
    }
  })
})
