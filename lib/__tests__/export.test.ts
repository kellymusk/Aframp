import type { Payment } from '@/lib/api'
import { exportPaymentsToCSV } from '@/lib/export'

describe('exportPaymentsToCSV', () => {
  it('exports payment fields with escaped and spreadsheet-safe cells', () => {
    const payment: Payment = {
      id: '=1+1',
      merchant_id: 'merchant-1',
      wallet_id: 'wallet-1',
      wallet_address: 'G"wallet,1',
      tx_hash: 'hash-1',
      amount_stroops: 25_000_000n,
      asset: 'XLM',
      network: 'testnet',
      status: 'confirmed',
      confirmations: 2,
      created_at: '2026-10-02T12:00:00.000Z',
      updated_at: '2026-10-02T12:01:00.000Z',
    }

    const csv = exportPaymentsToCSV([payment])

    expect(csv).toContain('"Payment ID"')
    expect(csv).toContain('"\'=1+1"')
    expect(csv).toContain('"G""wallet,1"')
    expect(csv).toContain('"2.5","25000000"')
    expect(csv).toContain('"2026-10-02T12:00:00.000Z"')
  })

  it('returns the header row when there are no payments', () => {
    expect(exportPaymentsToCSV([])).toBe(
      '"Payment ID","Merchant ID","Wallet ID","Wallet Address","Transaction Hash","Amount","Amount (stroops)","Asset","Network","Status","Confirmations","Created At","Updated At"'
    )
  })
})
