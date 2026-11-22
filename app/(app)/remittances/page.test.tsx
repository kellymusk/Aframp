import { render, screen, waitFor } from '@testing-library/react'
import RemittancesPage from '@/app/(app)/remittances/page'
import { api, type Remittance } from '@/lib/api'
import { getStellarTransactionUrl } from '@/lib/stellar-network'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'session-token' }),
}))

jest.mock('@/lib/api', () => ({
  api: { listRemittances: jest.fn() },
}))

jest.mock('@/lib/stellar-network', () => ({
  getStellarTransactionUrl: jest.fn((hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`),
}))

const mockListRemittances = api.listRemittances as jest.Mock

const transactionHash = 'transaction-hash-1'

const remittance: Remittance = {
  id: 'remit-1',
  merchant_id: 'merchant-1',
  destination_address: 'GDESTINATIONADDRESS123456789',
  amount_stroops: 12500000n,
  asset: 'XLM',
  memo: null,
  status: 'confirmed',
  tx_hash: transactionHash,
  failure_reason: null,
  created_at: '2026-01-02T10:00:00.000Z',
  updated_at: '2026-01-02T10:01:00.000Z',
}

describe('RemittancesPage', () => {
  beforeEach(() => mockListRemittances.mockReset())

  it('shows the status, amount, destination and transaction hash', async () => {
    mockListRemittances.mockResolvedValue([remittance])
    render(<RemittancesPage />)

    expect(await screen.findByText('confirmed')).toBeInTheDocument()
    expect(screen.getByText('1.25 XLM')).toBeInTheDocument()
    expect(screen.getByText(remittance.destination_address)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: transactionHash })).toHaveAttribute(
      'href',
      getStellarTransactionUrl(transactionHash)
    )
    await waitFor(() =>
      expect(mockListRemittances).toHaveBeenCalledWith('session-token', 50, expect.any(AbortSignal))
    )
  })

  it('shows the empty state when there are no transfers', async () => {
    mockListRemittances.mockResolvedValue([])
    render(<RemittancesPage />)

    expect(await screen.findByText('No outbound transfers yet.')).toBeInTheDocument()
  })
})
