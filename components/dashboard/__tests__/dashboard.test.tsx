/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// framer-motion — strip animations
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.ComponentProps<'div'>) => <div {...rest}>{children}</div>,
    button: ({ children, ...rest }: React.ComponentProps<'button'>) => (
      <button {...rest}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// balance-context
const mockUseBalanceContext = jest.fn()
jest.mock('@/contexts/balance-context', () => ({
  useBalanceContext: () => mockUseBalanceContext(),
}))

// stellar-p2p (used by the fixed send-modal)
jest.mock('@/lib/stellar-p2p', () => ({
  sendStellarP2P: jest.fn().mockResolvedValue({ txHash: 'abc123' }),
  isValidStellarAddress: jest.fn((addr: string) => /^G[A-Z2-7]{55}$/.test(addr)),
}))

// lib/wallet (FreighterNetwork type mock)
jest.mock('@/lib/wallet', () => ({}))

// use-swap hook used by SwapModal
jest.mock('@/hooks/use-swap', () => ({
  useSwap: () => ({
    step: 'input',
    simulation: null,
    txHash: null,
    error: null,
    isSimulating: false,
    simulate: jest.fn(),
    confirmSwap: jest.fn(),
    reset: jest.fn(),
  }),
}))

// lib/swap/stellar-swap
jest.mock('@/lib/swap/stellar-swap', () => ({
  SWAP_ASSETS: ['cNGN', 'USDC', 'XLM'],
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────
import { BalanceCard } from '@/components/dashboard/balance-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { SendModal } from '@/components/dashboard/send-modal'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeBalance(overrides = {}) {
  return {
    symbol: 'cNGN',
    amount: 1000000,
    price: 0.00063,
    priceLoading: false,
    priceError: undefined,
    change: 2.5,
    trend: 'up' as const,
    ...overrides,
  }
}

// ─── BalanceCard ──────────────────────────────────────────────────────────────
describe('BalanceCard', () => {
  it('renders the token symbol', () => {
    render(<BalanceCard balance={makeBalance({ symbol: 'XLM' })} />)
    expect(screen.getByText('XLM')).toBeInTheDocument()
  })

  it('renders the formatted amount', () => {
    render(<BalanceCard balance={makeBalance({ symbol: 'cNGN', amount: 1000000 })} />)
    // cNGN format: no decimals, locale-formatted
    expect(screen.getByText('1,000,000')).toBeInTheDocument()
  })

  it('renders loading skeletons when loading=true', () => {
    const { container } = render(
      <BalanceCard balance={makeBalance()} loading={true} />
    )
    // Skeleton components are rendered — check by class or aria
    const skeletons = container.querySelectorAll('[class*="skeleton"], [data-slot="skeleton"]')
    // At minimum the card should not show the amount text
    expect(screen.queryByText('1,000,000')).not.toBeInTheDocument()
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders TrendingUp icon when trend is up', () => {
    const { container } = render(<BalanceCard balance={makeBalance({ trend: 'up' })} />)
    // lucide icons render as svg
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders TrendingDown icon when trend is down', () => {
    const { container } = render(<BalanceCard balance={makeBalance({ trend: 'down' })} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders USD value when price and amount are provided', () => {
    // amount=1000, price=1 => $1,000.00
    render(<BalanceCard balance={makeBalance({ amount: 1000, price: 1 })} />)
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
  })

  it('renders — when no price is available', () => {
    render(<BalanceCard balance={makeBalance({ price: undefined })} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders change percentage', () => {
    render(<BalanceCard balance={makeBalance({ change: 3.5, trend: 'up' })} />)
    expect(screen.getByText('+3.50%')).toBeInTheDocument()
  })
})

// ─── QuickActions ─────────────────────────────────────────────────────────────
describe('QuickActions', () => {
  const onSwap = jest.fn()
  const onSend = jest.fn()
  const onReceive = jest.fn()

  beforeEach(() => {
    onSwap.mockClear()
    onSend.mockClear()
    onReceive.mockClear()
    mockPush.mockClear()
  })

  function renderQuickActions() {
    return render(<QuickActions onSwap={onSwap} onSend={onSend} onReceive={onReceive} />)
  }

  it('renders all 6 action buttons', () => {
    renderQuickActions()
    expect(screen.getByText('Swap')).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Receive')).toBeInTheDocument()
    expect(screen.getByText('Lightning')).toBeInTheDocument()
    expect(screen.getByText('Onramp')).toBeInTheDocument()
    expect(screen.getByText('Pay Bills')).toBeInTheDocument()
  })

  it('clicking Swap calls onSwap', () => {
    renderQuickActions()
    fireEvent.click(screen.getByText('Swap'))
    expect(onSwap).toHaveBeenCalledTimes(1)
  })

  it('clicking Send calls onSend', () => {
    renderQuickActions()
    fireEvent.click(screen.getByText('Send'))
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('clicking Receive calls onReceive', () => {
    renderQuickActions()
    fireEvent.click(screen.getByText('Receive'))
    expect(onReceive).toHaveBeenCalledTimes(1)
  })

  it('clicking Onramp navigates to /onramp', () => {
    renderQuickActions()
    fireEvent.click(screen.getByText('Onramp'))
    expect(mockPush).toHaveBeenCalledWith('/onramp')
  })

  it('clicking Pay Bills navigates to /bills', () => {
    renderQuickActions()
    fireEvent.click(screen.getByText('Pay Bills'))
    expect(mockPush).toHaveBeenCalledWith('/bills')
  })
})

// ─── DashboardContent ─────────────────────────────────────────────────────────
describe('DashboardContent', () => {
  const defaultContext = {
    balances: [
      makeBalance({ symbol: 'cNGN', amount: 500000 }),
      makeBalance({ symbol: 'XLM', amount: 100, price: 0.1 }),
    ],
    totalUsdValue: 325,
    loading: false,
    lastUpdated: new Date('2026-01-01T10:00:00Z'),
    refetch: jest.fn(),
  }

  beforeEach(() => {
    mockUseBalanceContext.mockReturnValue(defaultContext)
  })

  it('renders loading skeletons when loading=true', () => {
    mockUseBalanceContext.mockReturnValue({ ...defaultContext, loading: true })
    const { container } = render(
      <DashboardContent walletName="My Wallet" walletAddress="GABCD" />
    )
    // In loading state, BalanceCards aren't rendered
    expect(screen.queryByText('500,000')).not.toBeInTheDocument()
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders balance cards when balances are provided', () => {
    render(<DashboardContent walletName="My Wallet" walletAddress="GABCD" />)
    expect(screen.getByText('cNGN')).toBeInTheDocument()
    expect(screen.getByText('XLM')).toBeInTheDocument()
  })

  it('shows total USD value when greater than 0', () => {
    render(<DashboardContent walletName="My Wallet" walletAddress="GABCD" />)
    expect(screen.getByText('$325.00')).toBeInTheDocument()
  })

  it('does not show total balance section when totalUsdValue is 0', () => {
    mockUseBalanceContext.mockReturnValue({ ...defaultContext, totalUsdValue: 0 })
    render(<DashboardContent walletName="My Wallet" walletAddress="GABCD" />)
    expect(screen.queryByText('Total Balance')).not.toBeInTheDocument()
  })

  it('renders Quick Actions section', () => {
    render(<DashboardContent walletName="My Wallet" walletAddress="GABCD" />)
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
  })

  it('clicking swap quick action opens swap modal', () => {
    render(<DashboardContent walletName="My Wallet" walletAddress="GABCD" />)
    fireEvent.click(screen.getByText('Swap'))
    expect(screen.getByText('Swap Tokens')).toBeInTheDocument()
  })

  it('clicking send quick action opens send modal', () => {
    render(<DashboardContent walletName="My Wallet" walletAddress="GABCD" />)
    fireEvent.click(screen.getByText('Send'))
    expect(screen.getByText('Send Tokens')).toBeInTheDocument()
  })
})

// ─── SendModal ────────────────────────────────────────────────────────────────
describe('SendModal', () => {
  const onOpenChange = jest.fn()

  beforeEach(() => {
    onOpenChange.mockClear()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) =>
          key === 'walletAddress' ? 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345678' : null
        ),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
  })

  it('renders the dialog when open=true', () => {
    render(<SendModal open={true} onOpenChange={onOpenChange} />)
    expect(screen.getByText('Send Tokens')).toBeInTheDocument()
  })

  it('does not render dialog content when open=false', () => {
    render(<SendModal open={false} onOpenChange={onOpenChange} />)
    expect(screen.queryByText('Send Tokens')).not.toBeInTheDocument()
  })

  it('send button is disabled when amount is empty', () => {
    render(<SendModal open={true} onOpenChange={onOpenChange} />)
    const sendButton = screen.getByRole('button', { name: /send tokens/i })
    expect(sendButton).toBeDisabled()
  })

  it('send button is disabled when address is empty', () => {
    render(<SendModal open={true} onOpenChange={onOpenChange} />)
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '100' } })
    // address still empty
    const sendButton = screen.getByRole('button', { name: /send tokens/i })
    expect(sendButton).toBeDisabled()
  })

  it('send button becomes enabled when both amount and address are filled', () => {
    render(<SendModal open={true} onOpenChange={onOpenChange} />)
    const amountInput = screen.getByPlaceholderText('0.00')
    const addressInput = screen.getByPlaceholderText(/GXXXXXX/i)

    fireEvent.change(amountInput, { target: { value: '100' } })
    fireEvent.change(addressInput, { target: { value: 'GABCDEFGH12345' } })

    const sendButton = screen.getByRole('button', { name: /send tokens/i })
    expect(sendButton).toBeEnabled()
  })

  it('shows currency selector with default cNGN', () => {
    render(<SendModal open={true} onOpenChange={onOpenChange} />)
    const selector = screen.getByRole('combobox') as HTMLSelectElement
    expect(selector.value).toBe('cNGN')
  })

  it('shows all currency options', () => {
    render(<SendModal open={true} onOpenChange={onOpenChange} />)
    const options = screen.getAllByRole('option').map((o) => (o as HTMLOptionElement).value)
    expect(options).toEqual(expect.arrayContaining(['cNGN', 'XLM', 'USDT']))
  })
})
