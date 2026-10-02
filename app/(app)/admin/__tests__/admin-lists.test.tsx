import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import AdminOverviewPage from '../page'
import AdminMerchantsPage from '../merchants/page'
import AdminPaymentRequestsPage from '../payment-requests/page'
import AdminTransactionsPage from '../transactions/page'
import AdminWalletsPage from '../wallets/page'
import AdminWithdrawalsPage from '../withdrawals/page'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'admin-token' }),
}))

jest.mock('@/lib/api', () => ({
  api: {
    adminOverview: jest.fn(),
    adminMerchants: jest.fn(),
    adminPaymentRequests: jest.fn(),
    adminTransactions: jest.fn(),
    adminWallets: jest.fn(),
    adminWithdrawals: jest.fn(),
  },
}))

const ADDRESS = 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQHA'
const base = { created_at: '2026-10-02T09:13:00Z', updated_at: '2026-10-02T09:13:00Z' }

interface ListCase {
  name: string
  Page: ComponentType
  load: keyof typeof api
  rows: Record<string, unknown>[]
  shows: string
  search: string
  empty: string
  failure: string
}

const cases: ListCase[] = [
  {
    name: 'merchants',
    Page: AdminMerchantsPage,
    load: 'adminMerchants',
    rows: [
      {
        ...base,
        id: 'm1',
        name: 'Okafor Textiles',
        owner_email: 'ada@ok.ng',
        wallet_address: ADDRESS,
      },
      {
        ...base,
        id: 'm2',
        name: 'Bello Foods',
        owner_email: 'tunde@bello.ng',
        wallet_address: null,
      },
    ],
    shows: 'Okafor Textiles',
    search: 'bello',
    empty: 'No merchants yet.',
    failure: 'Could not load merchants',
  },
  {
    name: 'payment requests',
    Page: AdminPaymentRequestsPage,
    load: 'adminPaymentRequests',
    rows: [
      {
        ...base,
        id: 'r1',
        merchant_name: 'Okafor Textiles',
        amount_stroops: 500_000_000n,
        asset: 'cNGN',
        memo: 'INV-1',
        status: 'paid',
        payment_id: 'p1',
        expires_at: base.created_at,
      },
      {
        ...base,
        id: 'r2',
        merchant_name: 'Bello Foods',
        amount_stroops: 10_000_000n,
        asset: 'XLM',
        memo: 'INV-2',
        status: 'expired',
        payment_id: null,
        expires_at: base.created_at,
      },
    ],
    shows: 'INV-1',
    search: 'inv-2',
    empty: 'No payment requests yet.',
    failure: 'Could not load payment requests',
  },
  {
    name: 'transactions',
    Page: AdminTransactionsPage,
    load: 'adminTransactions',
    rows: [
      {
        ...base,
        id: 't1',
        merchant_id: 'm1',
        merchant_name: 'Okafor Textiles',
        wallet_address: ADDRESS,
        tx_hash: 'a'.repeat(64),
        amount_stroops: 250_000_000n,
        asset: 'cNGN',
        network: 'stellar',
        status: 'detected',
        confirmations: 0,
      },
      {
        ...base,
        id: 't2',
        merchant_id: 'm2',
        merchant_name: 'Bello Foods',
        wallet_address: ADDRESS,
        tx_hash: 'b'.repeat(64),
        amount_stroops: 10_000_000n,
        asset: 'XLM',
        network: 'stellar',
        status: 'confirmed',
        confirmations: 3,
      },
    ],
    shows: 'Incoming',
    search: 'bello',
    empty: 'No transactions yet.',
    failure: 'Could not load transactions',
  },
  {
    name: 'wallets',
    Page: AdminWalletsPage,
    load: 'adminWallets',
    rows: [
      {
        ...base,
        id: 'w1',
        merchant_id: 'm1',
        merchant_name: 'Okafor Textiles',
        address: ADDRESS,
        network: 'stellar',
      },
      {
        ...base,
        id: 'w2',
        merchant_id: 'm2',
        merchant_name: 'Bello Foods',
        address: 'G' + 'B'.repeat(55),
        network: 'stellar',
      },
    ],
    shows: 'Okafor Textiles',
    search: 'bello',
    empty: 'No wallets yet.',
    failure: 'Could not load wallets',
  },
  {
    name: 'withdrawals',
    Page: AdminWithdrawalsPage,
    load: 'adminWithdrawals',
    rows: [
      {
        ...base,
        id: 'd1',
        merchant_id: 'm1',
        merchant_name: 'Okafor Textiles',
        amount_stroops: 500_000_000n,
        asset: 'cNGN',
        status: 'failed',
        provider: 'flutterwave',
        provider_reference: 'FLW-1',
        bank_code: '044',
        account_number: '0123456789',
        failure_reason: 'Account name mismatch',
      },
      {
        ...base,
        id: 'd2',
        merchant_id: 'm2',
        merchant_name: 'Bello Foods',
        amount_stroops: 100_000_000n,
        asset: 'cNGN',
        status: 'completed',
        provider: null,
        provider_reference: null,
        bank_code: null,
        account_number: null,
        failure_reason: null,
      },
    ],
    shows: 'Account name mismatch',
    search: 'bello',
    empty: 'No withdrawals yet.',
    failure: 'Could not load withdrawals',
  },
]

beforeEach(() => jest.clearAllMocks())

describe.each(cases)('admin $name page', ({ Page, load, rows, shows, search, empty, failure }) => {
  const mockLoad = () => api[load] as unknown as jest.Mock

  it('loads with the admin token and renders the rows', async () => {
    mockLoad().mockResolvedValue(rows)
    render(<Page />)

    expect(await screen.findByText(shows)).toBeInTheDocument()
    expect(mockLoad()).toHaveBeenCalledWith('admin-token', 100, expect.anything())
    expect(screen.getByText('2 rows')).toBeInTheDocument()
  })

  it('narrows the rows with the search box', async () => {
    mockLoad().mockResolvedValue(rows)
    render(<Page />)
    await screen.findByText(shows)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: search } })
    expect(screen.getByText('1 of 2 rows')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockLoad().mockResolvedValue([])
    render(<Page />)
    expect(await screen.findByText(empty)).toBeInTheDocument()
  })

  it('shows a load failure and retries', async () => {
    mockLoad().mockRejectedValueOnce('boom').mockResolvedValueOnce(rows)
    render(<Page />)

    expect(await screen.findByText(failure)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText(shows)).toBeInTheDocument()
  })
})

describe('admin overview page', () => {
  const overview = {
    total_users: 1284,
    total_merchants: 932,
    total_wallets: 918,
    balances_by_asset: [{ asset: 'cNGN', available: 98_000_000_000n, pending: 2_000_000_000n }],
    payments_by_status: [{ status: 'confirmed', count: 15201 }],
    withdrawals_by_status: [],
    payment_requests_by_status: [],
  }

  it('shows platform totals with thousands separators', async () => {
    ;(api.adminOverview as jest.Mock).mockResolvedValue(overview)
    render(<AdminOverviewPage />)

    expect(await screen.findByText('1,284')).toBeInTheDocument()
    expect(screen.getByText('15,201')).toBeInTheDocument()
    expect(screen.getByText(/9,800 available/)).toBeInTheDocument()
  })

  it('shows a load failure and retries', async () => {
    ;(api.adminOverview as jest.Mock)
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(overview)
    render(<AdminOverviewPage />)

    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('1,284')).toBeInTheDocument()
  })
})
