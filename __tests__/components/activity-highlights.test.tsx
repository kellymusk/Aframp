/**
 * Tests for ActivityHighlights component, specifically the timezone-aware
 * isToday function to ensure day boundaries are consistent with backend.
 */

import { render, screen } from '@testing-library/react'
import { ActivityHighlights } from '@/components/wallet/activity-highlights'
import type { Payment } from '@/lib/api'

// Mock payment factory
function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'test-payment-1',
    merchant_id: 'merchant-1',
    wallet_id: 'wallet-1',
    wallet_address: 'GTEST',
    tx_hash: 'hash-1',
    network: 'testnet',
    confirmations: 1,
    asset: 'XLM',
    amount_stroops: 1000000n,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('ActivityHighlights timezone consistency', () => {
  it('classifies a payment at UTC day boundary correctly', () => {
    // Create a payment at 23:59:59 UTC on a specific day
    const utcDate = new Date('2024-01-15T23:59:59Z')
    const payment = makePayment({
      created_at: utcDate.toISOString(),
      amount_stroops: 5000000n,
    })

    // Render as if it's still the same UTC day
    render(<ActivityHighlights payments={[payment]} openRequestCount={0} />)

    // Should show the payment in "Taken today"
    expect(screen.getByText(/Taken today/)).toBeInTheDocument()
    expect(screen.getByText('0.5')).toBeInTheDocument() // 5000000 stroops = 0.5 XLM
  })

  it('excludes a payment from yesterday UTC even if today in local time', () => {
    // Create a payment at 01:00 UTC yesterday
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(1, 0, 0, 0)

    const payment = makePayment({
      created_at: yesterday.toISOString(),
      amount_stroops: 3000000n,
    })

    render(<ActivityHighlights payments={[payment]} openRequestCount={0} />)

    // Should show "Nothing yet" because payment is from yesterday UTC
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('counts multiple assets separately', () => {
    const now = new Date()
    const payments = [
      makePayment({ asset: 'XLM', amount_stroops: 1000000n, created_at: now.toISOString() }),
      makePayment({ asset: 'USDC', amount_stroops: 2000000n, created_at: now.toISOString() }),
      makePayment({ asset: 'XLM', amount_stroops: 500000n, created_at: now.toISOString() }),
    ]

    render(<ActivityHighlights payments={payments} openRequestCount={0} />)

    expect(screen.getByText(/Taken today · XLM/)).toBeInTheDocument()
    expect(screen.getByText(/Taken today · USDC/)).toBeInTheDocument()
    expect(screen.getByText('0.15')).toBeInTheDocument() // 1.5M XLM stroops = 0.15 XLM
    expect(screen.getByText('0.2')).toBeInTheDocument() // 2M USDC stroops = 0.2 USDC
  })

  it('ignores non-confirmed payments', () => {
    const now = new Date()
    const payments = [
      makePayment({ status: 'confirmed', amount_stroops: 1000000n, created_at: now.toISOString() }),
      makePayment({ status: 'detected', amount_stroops: 5000000n, created_at: now.toISOString() }),
    ]

    render(<ActivityHighlights payments={payments} openRequestCount={0} />)

    // Only confirmed payment should count
    expect(screen.getByText('0.1')).toBeInTheDocument()
  })
})
