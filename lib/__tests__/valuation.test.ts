import type { Balance } from '@/lib/api'
import { STROOPS_PER_UNIT } from '@/lib/money'
import { estimateAvailableNgn, fetchNgnRates } from '@/lib/valuation'

const balance = (asset: string, available: bigint, pending = 0n): Balance => ({
  merchant_id: 'merchant-1',
  asset,
  available,
  pending,
  updated_at: '2026-01-01T00:00:00Z',
})

describe('fetchNgnRates', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('loads and scales CoinGecko NGN rates', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          stellar: { ngn: 175.3 },
          'usd-coin': { ngn: 1354.67 },
        }),
    })

    await expect(fetchNgnRates()).resolves.toEqual({
      XLM: 175_300_000n,
      USDC: 1_354_670_000n,
    })
  })

  it('rejects incomplete or unavailable rate responses', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stellar: { ngn: 175.3 } }),
    })
    await expect(fetchNgnRates()).rejects.toThrow('response is incomplete')

    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchNgnRates()).rejects.toThrow('HTTP 503')
  })
})

describe('estimateAvailableNgn', () => {
  const rates = { XLM: 175_300_000n, USDC: 1_354_670_000n }

  it('adds cNGN, USDC, and XLM values while excluding pending funds', () => {
    const balances = [
      balance('cNGN', 100n * STROOPS_PER_UNIT, 50n * STROOPS_PER_UNIT),
      balance('USDC', 2n * STROOPS_PER_UNIT),
      balance('XLM', 10n * STROOPS_PER_UNIT),
    ]

    expect(estimateAvailableNgn(balances, rates)).toBe(4_562n)
  })

  it('keeps large balances exact and returns null for an unpriced asset', () => {
    expect(
      estimateAvailableNgn([balance('cNGN', 9_007_199_254_740_993n * STROOPS_PER_UNIT)], rates)
    ).toBe(9_007_199_254_740_993n)
    expect(estimateAvailableNgn([balance('OTHER', STROOPS_PER_UNIT)], rates)).toBeNull()
  })
})
