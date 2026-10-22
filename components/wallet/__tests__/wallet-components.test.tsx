import { render } from '@testing-library/react'
import { ActivityHighlights } from '@/components/wallet/activity-highlights'
import { BalanceFigure } from '@/components/wallet/balance-figure'
import { QuickActions } from '@/components/wallet/quick-actions'
import type { Payment } from '@/lib/api'

function payment(overrides: Partial<Payment>): Payment {
  const today = new Date()
  today.setHours(10, 0, 0, 0)

  return {
    id: 'payment-1',
    merchant_id: 'merchant-1',
    wallet_id: 'wallet-1',
    wallet_address: 'GADDRESS',
    tx_hash: 'transaction-hash',
    amount_stroops: 125_000_000n,
    asset: 'XLM',
    network: 'testnet',
    status: 'confirmed',
    confirmations: 1,
    created_at: today.toISOString(),
    updated_at: today.toISOString(),
    ...overrides,
  }
}

describe('wallet dashboard components', () => {
  it('matches the BalanceFigure snapshot with available and pending amounts', () => {
    const { container } = render(
      <BalanceFigure asset="XLM" available={123_456_789n} pending={20_000_000n} />
    )

    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches the isolated QuickActions snapshot', () => {
    const { container } = render(<QuickActions />)

    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches the ActivityHighlights snapshot for confirmed payments today', () => {
    const { container } = render(
      <ActivityHighlights
        payments={[
          payment({ amount_stroops: 125_000_000n }),
          payment({ id: 'payment-2', amount_stroops: 75_000_000n }),
          payment({ id: 'payment-3', asset: 'USDC', amount_stroops: 30_000_000n }),
          payment({ id: 'payment-4', status: 'detected', amount_stroops: 900_000_000n }),
        ]}
        openRequestCount={3}
      />
    )

    expect(container.firstChild).toMatchSnapshot()
  })
})
