import { render, screen, within } from '@testing-library/react'
import { RecentPayments, latestPayments } from '../recent-payments'
import type { Payment } from '@/lib/api'

const payment = (id: string, createdAt: string, overrides: Partial<Payment> = {}): Payment =>
  ({
    id,
    amount_stroops: 25_000_000n,
    asset: 'USDC',
    status: 'confirmed',
    created_at: createdAt,
    ...overrides,
  }) as Payment

describe('latestPayments', () => {
  it('returns the newest five, newest first', () => {
    const payments = Array.from({ length: 7 }, (_, i) =>
      payment(`p-${i}`, `2026-10-0${i + 1}T10:00:00Z`)
    )
    expect(latestPayments(payments).map((p) => p.id)).toEqual(['p-6', 'p-5', 'p-4', 'p-3', 'p-2'])
  })
})

describe('RecentPayments', () => {
  it('lists each payment with its amount and status', () => {
    render(
      <RecentPayments
        payments={[
          payment('a', '2026-10-01T10:00:00Z'),
          payment('b', '2026-10-02T10:00:00Z', { status: 'failed', asset: 'cNGN' }),
          payment('c', '2026-10-03T10:00:00Z', { status: 'detected' }),
        ]}
      />
    )

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('Incoming')).toBeInTheDocument()
    expect(within(items[1]).getByText('Failed')).toBeInTheDocument()
    expect(within(items[1]).getByText('cNGN')).toBeInTheDocument()
    expect(within(items[2]).getByText('Paid')).toBeInTheDocument()
    expect(within(items[2]).getByText('2.5', { exact: false })).toBeInTheDocument()
  })

  it('links to the full Payments page', () => {
    render(<RecentPayments payments={[]} />)
    expect(screen.getByRole('link', { name: /view all payments/i })).toHaveAttribute(
      'href',
      '/transactions'
    )
  })

  it('explains the empty state', () => {
    render(<RecentPayments payments={[]} />)
    expect(screen.getByText(/no payments yet/i)).toBeInTheDocument()
  })
})
