import { render, screen } from '@testing-library/react'
import HomePage from '@/app/(app)/home/page'
import { api, type Balance } from '@/lib/api'
import { fetchNgnRates } from '@/lib/valuation'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('lucide-react', () => ({ ArrowRight: () => null }))
jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'session-token' }),
}))
jest.mock('@/lib/api', () => ({
  api: {
    getBalances: jest.fn(),
    listTransactions: jest.fn(),
    listPaymentRequests: jest.fn(),
  },
}))
jest.mock('@/lib/valuation', () => ({
  ...jest.requireActual('@/lib/valuation'),
  fetchNgnRates: jest.fn(),
}))
jest.mock('@/components/wallet/activity-highlights', () => ({ ActivityHighlights: () => null }))
jest.mock('@/components/wallet/balance-figure', () => ({ BalanceFigure: () => null }))
jest.mock('@/components/wallet/quick-actions', () => ({ QuickActions: () => null }))
jest.mock('@/components/wallet/quick-convert', () => ({ QuickConvert: () => null }))
jest.mock('@/components/wallet/revenue-chart', () => ({ RevenueChart: () => null }))
jest.mock('@/components/wallet/top-assets', () => ({ TopAssets: () => null }))
jest.mock('@/components/ui/error-state', () => ({ ErrorState: () => null }))
jest.mock('@/components/ui/loading-spinner', () => ({ LoadingSpinner: () => null }))
jest.mock('@/components/onboarding/onboarding-checklist', () => ({
  OnboardingChecklist: () => null,
}))
jest.mock('@/components/push-notification-opt-in', () => ({ PushNotificationOptIn: () => null }))

const availableBalances: Balance[] = [
  {
    merchant_id: 'merchant-1',
    asset: 'cNGN',
    available: 100n * 10_000_000n,
    pending: 50n * 10_000_000n,
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    merchant_id: 'merchant-1',
    asset: 'USDC',
    available: 2n * 10_000_000n,
    pending: 0n,
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    merchant_id: 'merchant-1',
    asset: 'XLM',
    available: 10n * 10_000_000n,
    pending: 0n,
    updated_at: '2026-01-01T00:00:00Z',
  },
]

describe('HomePage NGN estimate', () => {
  const mockGetBalances = api.getBalances as jest.Mock
  const mockListTransactions = api.listTransactions as jest.Mock
  const mockListPaymentRequests = api.listPaymentRequests as jest.Mock
  const mockFetchNgnRates = fetchNgnRates as jest.Mock

  beforeEach(() => {
    mockGetBalances.mockReset().mockResolvedValue(availableBalances)
    mockListTransactions.mockReset().mockResolvedValue([])
    mockListPaymentRequests.mockReset().mockResolvedValue([])
    mockFetchNgnRates.mockReset().mockResolvedValue({
      XLM: 175_300_000n,
      USDC: 1_354_670_000n,
    })
  })

  it('shows the combined approximate available value in naira', async () => {
    render(<HomePage />)

    expect(await screen.findByText('Estimated total (NGN)')).toBeInTheDocument()
    expect(await screen.findByText(/₦4,562/)).toBeInTheDocument()
    expect(
      screen.getByText('Approximate market value; pending balances are excluded.')
    ).toBeInTheDocument()
  })

  it('keeps the dashboard available when market rates fail', async () => {
    mockFetchNgnRates.mockRejectedValue(new Error('Network unavailable'))
    render(<HomePage />)

    expect(await screen.findByText('Unavailable')).toBeInTheDocument()
    expect(screen.getByText('Market rates are temporarily unavailable.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
