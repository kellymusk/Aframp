import { assetsInSeries, buildDailyRevenue } from '@/lib/revenue'
import type { Payment } from '@/lib/api'

const NOW = new Date('2026-08-15T12:00:00.000Z')

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: 'p1',
    merchant_id: 'm1',
    wallet_id: 'w1',
    wallet_address: 'GADDRESS',
    tx_hash: 'hash',
    amount_stroops: 10_000_000n,
    asset: 'XLM',
    network: 'testnet',
    status: 'confirmed',
    confirmations: 1,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  }
}

describe('buildDailyRevenue', () => {
  it('returns exactly 7 entries, oldest first, ending on `now`', () => {
    const entries = buildDailyRevenue([], NOW)
    expect(entries).toHaveLength(7)
    expect(entries[6].date).toBe('2026-08-15')
    expect(entries[0].date).toBe('2026-08-09')
  })

  it('sums confirmed payments for the same day and asset', () => {
    const payments = [
      payment({ amount_stroops: 10_000_000n, created_at: NOW.toISOString() }),
      payment({ amount_stroops: 25_000_000n, created_at: NOW.toISOString() }),
    ]
    const entries = buildDailyRevenue(payments, NOW)
    expect(entries[6].totals.XLM).toBe(3.5)
  })

  it('ignores payments that are not confirmed', () => {
    const payments = [
      payment({ status: 'detected' }),
      payment({ status: 'verified' }),
      payment({ status: 'failed' }),
    ]
    const entries = buildDailyRevenue(payments, NOW)
    expect(entries.every((e) => Object.keys(e.totals).length === 0)).toBe(true)
  })

  it('keys totals per asset separately, never summing across assets', () => {
    const payments = [
      payment({ asset: 'XLM', amount_stroops: 10_000_000n }),
      payment({ asset: 'cNGN', amount_stroops: 50_000_000n }),
    ]
    const entries = buildDailyRevenue(payments, NOW)
    expect(entries[6].totals).toEqual({ XLM: 1, cNGN: 5 })
  })

  it('buckets a payment into the correct day within the window', () => {
    const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000)
    const payments = [
      payment({ created_at: twoDaysAgo.toISOString(), amount_stroops: 10_000_000n }),
    ]
    const entries = buildDailyRevenue(payments, NOW)
    const bucket = entries.find((e) => e.date === '2026-08-13')
    expect(bucket?.totals.XLM).toBe(1)
    expect(entries[6].totals.XLM).toBeUndefined()
  })

  it('drops payments older than the 7-day window', () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000)
    const payments = [payment({ created_at: tenDaysAgo.toISOString() })]
    const entries = buildDailyRevenue(payments, NOW)
    expect(entries.every((e) => Object.keys(e.totals).length === 0)).toBe(true)
  })

  it('drops payments dated after `now` (clock skew) instead of throwing', () => {
    const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
    const payments = [payment({ created_at: tomorrow.toISOString() })]
    expect(() => buildDailyRevenue(payments, NOW)).not.toThrow()
    const entries = buildDailyRevenue(payments, NOW)
    expect(entries.every((e) => Object.keys(e.totals).length === 0)).toBe(true)
  })
})

describe('assetsInSeries', () => {
  it('returns an empty array when nothing was confirmed', () => {
    expect(assetsInSeries(buildDailyRevenue([], NOW))).toEqual([])
  })

  it('lists every asset that appears anywhere in the series, in first-seen order', () => {
    const entries = buildDailyRevenue(
      [
        payment({ asset: 'cNGN', created_at: NOW.toISOString() }),
        payment({
          asset: 'XLM',
          created_at: new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        }),
      ],
      NOW
    )
    expect(assetsInSeries(entries)).toEqual(['XLM', 'cNGN'])
  })
})
