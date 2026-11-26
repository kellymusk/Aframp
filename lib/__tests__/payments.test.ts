import type { Payment } from '@/lib/api'
import {
  filterPaymentsByDateRange,
  filterPaymentsByDateRangeDetailed,
  searchPayments,
} from '@/lib/payments'

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    merchant_id: '22222222-2222-2222-2222-222222222222',
    wallet_id: '33333333-3333-3333-3333-333333333333',
    wallet_address: 'GABCDEF',
    tx_hash: 'deadbeef',
    amount_stroops: BigInt(125_000_000),
    asset: 'USDC',
    network: 'testnet',
    status: 'confirmed',
    confirmations: 1,
    created_at: '2026-03-10T12:00:00',
    updated_at: '2026-03-10T12:00:00',
    ...overrides,
  } as Payment
}

describe('searchPayments', () => {
  const payments = [
    makePayment(),
    makePayment({
      id: 'aaaaaaaa-0000-0000-0000-000000000000',
      merchant_id: 'bbbbbbbb-0000-0000-0000-000000000000',
      tx_hash: 'cafebabe',
      wallet_address: 'GZZZ',
      asset: 'XLM',
      amount_stroops: BigInt(990_000_000),
    }),
  ]

  it('returns everything for a blank query', () => {
    expect(searchPayments(payments, '   ')).toHaveLength(2)
  })

  it.each([
    ['payment id', 'AAAAAAAA-0000'],
    ['merchant id', 'bbbbbbbb'],
    ['tx hash', 'CAFE'],
    ['wallet', 'gzzz'],
    ['asset', 'xlm'],
    ['raw stroops amount', '990000000'],
  ])('matches by %s', (_label, query) => {
    const result = searchPayments(payments, query)
    expect(result).toHaveLength(1)
    expect(result[0].tx_hash).toBe('cafebabe')
  })
})

describe('filterPaymentsByDateRange', () => {
  const payments = [
    makePayment({ id: 'a', created_at: '2026-03-01T09:00:00' }),
    makePayment({ id: 'b', created_at: '2026-03-10T23:59:00' }),
    makePayment({ id: 'c', created_at: '2026-03-20T09:00:00' }),
  ]

  it('filters by an inclusive range', () => {
    const ids = filterPaymentsByDateRange(payments, '2026-03-05', '2026-03-10').map((p) => p.id)
    expect(ids).toEqual(['b'])
  })

  it('does not drop all rows when fromDate is malformed', () => {
    expect(filterPaymentsByDateRange(payments, 'not-a-date', null)).toHaveLength(3)
  })

  it('ignores a malformed toDate but still applies a valid fromDate', () => {
    const result = filterPaymentsByDateRangeDetailed(payments, '2026-03-05', '2026-13-99')
    expect(result.payments.map((p) => p.id)).toEqual(['b', 'c'])
    expect(result.invalid).toEqual(['toDate'])
  })
})
