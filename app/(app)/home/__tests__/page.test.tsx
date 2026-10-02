import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '../page'
import { api, type Balance, type Payment, type PaymentRequest } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'tok-1', userId: 'u-1', merchantId: 'm-1' }),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getBalances: jest.fn(),
    listTransactions: jest.fn(),
    listPaymentRequests: jest.fn(),
    getWallet: jest.fn(),
    listWithdrawals: jest.fn(),
  },
}))

// The page's own logic is under test; its widgets have their own suites.
jest.mock('@/components/onboarding/onboarding-checklist', () => ({
  OnboardingChecklist: ({ progress }: { progress: Record<string, boolean> }) => (
    <span>
      checklist{' '}
      {Object.entries(progress)
        .filter(([, done]) => done)
        .map(([step]) => step)
        .join(',')}
    </span>
  ),
}))
jest.mock('@/components/wallet/balance-figure', () => ({
  BalanceFigure: ({ asset }: { asset: string }) => <span>balance {asset}</span>,
}))
jest.mock('@/components/wallet/quick-actions', () => ({ QuickActions: () => null }))
jest.mock('@/components/wallet/quick-convert', () => ({
  QuickConvert: ({ openRequests }: { openRequests: PaymentRequest[] }) => (
    <span>{openRequests.length} open requests</span>
  ),
}))
jest.mock('@/components/wallet/activity-highlights', () => ({
  ActivityHighlights: () => null,
}))
jest.mock('@/components/wallet/home-page-skeleton', () => ({
  HomePageSkeleton: () => <span>loading dashboard</span>,
}))
jest.mock('@/components/wallet/revenue-chart', () => ({
  RevenueChart: ({ payments }: { payments: Payment[] }) => (
    <span>revenue chart for {payments.length} payments</span>
  ),
}))

const mockApi = api as jest.Mocked<typeof api>

const balance = (asset: string): Balance => ({
  merchant_id: 'm-1',
  asset,
  available: 10_000_000n,
  pending: 0n,
  updated_at: '',
})

const request = (status: PaymentRequest['status']) => ({ status }) as PaymentRequest

beforeEach(() => {
  jest.clearAllMocks()
  mockApi.getBalances.mockResolvedValue([balance('USDC'), balance('cNGN')])
  mockApi.listTransactions.mockResolvedValue([{} as Payment, {} as Payment])
  mockApi.listPaymentRequests.mockResolvedValue([
    request('pending'),
    request('paid'),
    request('pending'),
  ])
  mockApi.getWallet.mockResolvedValue({ id: 'w-1' } as never)
  mockApi.listWithdrawals.mockResolvedValue([])
})

describe('HomePage', () => {
  it('shows the skeleton while the dashboard loads', () => {
    mockApi.getBalances.mockReturnValue(new Promise(() => {}))
    render(<HomePage />)
    expect(screen.getByText('loading dashboard')).toBeInTheDocument()
  })

  it('loads balances, payments and requests with the session token', async () => {
    render(<HomePage />)

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(mockApi.getBalances).toHaveBeenCalledWith('tok-1', expect.any(AbortSignal))
    expect(mockApi.listTransactions).toHaveBeenCalledWith('tok-1', 50, expect.any(AbortSignal))
    expect(mockApi.listPaymentRequests).toHaveBeenCalledWith('tok-1', 20, expect.any(AbortSignal))
    expect(screen.getByText('balance USDC')).toBeInTheDocument()
    expect(screen.getByText('balance cNGN')).toBeInTheDocument()
    expect(screen.getByText('2 open requests')).toBeInTheDocument()
  })

  it('lazy-loads the revenue chart with the payments', async () => {
    render(<HomePage />)
    expect(await screen.findByText('revenue chart for 2 payments')).toBeInTheDocument()
  })

  it('ticks off the getting-started steps from real activity', async () => {
    mockApi.listTransactions.mockResolvedValue([{ status: 'confirmed' } as Payment])
    render(<HomePage />)
    expect(await screen.findByText('checklist wallet,charge,payment')).toBeInTheDocument()
  })

  it('still loads the dashboard when the wallet or cash-outs cannot be fetched', async () => {
    mockApi.getWallet.mockRejectedValue(new Error('not found'))
    mockApi.listWithdrawals.mockRejectedValue(new Error('offline'))
    render(<HomePage />)
    expect(await screen.findByText('checklist charge')).toBeInTheDocument()
  })

  it('shows a zero balance when the merchant has no balances yet', async () => {
    mockApi.getBalances.mockResolvedValue([])
    render(<HomePage />)

    await screen.findByRole('heading', { name: 'Home' })
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('shows an error with a retry that reloads the dashboard', async () => {
    mockApi.getBalances.mockRejectedValueOnce(new Error('Could not load balances'))
    const user = userEvent.setup()
    render(<HomePage />)

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(mockApi.getBalances).toHaveBeenCalledTimes(2)
  })
})
