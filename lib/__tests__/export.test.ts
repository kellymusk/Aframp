import type { Payment } from '@/lib/api'
import { escapeCsvCell, exportPaymentsToCSV } from '@/lib/export'

const payment: Payment = {
  id: 'payment-1',
  merchant_id: 'merchant-1',
  wallet_id: 'wallet-1',
  wallet_address: 'GABC123',
  tx_hash: 'abc123',
  amount_stroops: 123_456_789n,
  asset: 'XLM',
  network: 'stellar-testnet',
  status: 'confirmed',
  confirmations: 5,
  created_at: '2026-09-28T12:00:00.000Z',
  updated_at: '2026-09-28T12:00:00.000Z',
}

describe('exportPaymentsToCSV', () => {
  it('exports payment details with exact decimal amounts', () => {
    expect(exportPaymentsToCSV([payment])).toBe(
      'created_at,amount,asset,status,tx_hash,wallet_address,network,confirmations\r\n' +
        '2026-09-28T12:00:00.000Z,12.3456789,XLM,confirmed,abc123,GABC123,stellar-testnet,5'
    )
  })

  it('escapes CSV delimiters and prevents formula execution in text fields', () => {
    const result = exportPaymentsToCSV([
      { ...payment, asset: 'XLM, "Gold"', wallet_address: '=IMPORTDATA("https://example.com")' },
    ])

    expect(result).toContain('"XLM, ""Gold"""')
    expect(result).toContain(`,"'=IMPORTDATA(""https://example.com"")",`)
  })

  it('includes only the header when there are no payments', () => {
    expect(exportPaymentsToCSV([])).toBe(
      'created_at,amount,asset,status,tx_hash,wallet_address,network,confirmations'
    )
  })
})

describe('escapeCsvCell', () => {
  it.each(['=SUM(A1)', '+1', '-1', '@x', ' =SUM(A1)', '\n=SUM(A1)', '\t+1', '\r-1'])(
    'neutralises formula %j',
    (value) => {
      const out = escapeCsvCell(value)
      expect(out.replace(/^"/, '').startsWith("'")).toBe(true)
    }
  )

  it('leaves numbers alone and quotes commas', () => {
    expect(escapeCsvCell(-5)).toBe('-5')
    expect(escapeCsvCell('-5', false)).toBe('-5')
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell(null)).toBe('')
  })
})
