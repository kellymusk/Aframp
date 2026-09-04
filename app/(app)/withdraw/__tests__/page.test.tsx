import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api, ApiError } from '@/lib/api'
import WithdrawPage from '../page'

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    api: {
      getBalances: jest.fn(),
      listWithdrawals: jest.fn(),
      createWithdrawal: jest.fn(),
    },
    ApiError,
  }
})

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

// Replace Radix Select with a plain <select> so value changes can be driven
// through ordinary DOM events in jsdom.
jest.mock('@/components/ui/select', () => {
  const React = jest.requireActual('react')
  return {
    Select: ({ value, onValueChange, disabled, children }: any) =>
      React.createElement(
        'select',
        {
          value,
          disabled,
          onChange: (event: any) => onValueChange(event.target.value),
        },
        children
      ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => children,
    SelectItem: ({ value, children }: any) => React.createElement('option', { value }, children),
  }
})

const mockGetBalances = api.getBalances as jest.Mock
const mockListWithdrawals = api.listWithdrawals as jest.Mock
const mockCreateWithdrawal = api.createWithdrawal as jest.Mock

function balance(asset: string, available: bigint) {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

function withdrawal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    merchant_id: 'm',
    amount_stroops: 500_000_000n,
    asset: 'cNGN',
    status: 'completed',
    provider: null,
    provider_reference: null,
    bank_code: '044',
    account_number: '0123456789',
    failure_reason: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetBalances.mockResolvedValue([])
  mockListWithdrawals.mockResolvedValue([])
  mockCreateWithdrawal.mockResolvedValue({})
})

describe('WithdrawPage', () => {
  it('shows a spinner while balances are loading', () => {
    mockGetBalances.mockReturnValue(new Promise(() => {}))
    mockListWithdrawals.mockReturnValue(new Promise(() => {}))
    render(<WithdrawPage />)
    expect(screen.queryByRole('heading', { name: 'Cash out' })).not.toBeInTheDocument()
  })

  it('shows a no-balance message when nothing can be cashed out', async () => {
    render(<WithdrawPage />)
    expect(await screen.findByText(/no balance to cash out/i)).toBeInTheDocument()
  })

  it('shows the load error when the backend fails', async () => {
    mockGetBalances.mockRejectedValue(new ApiError('boom', 500))
    render(<WithdrawPage />)
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('renders recent cash-outs', async () => {
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    mockListWithdrawals.mockResolvedValue([withdrawal()])
    render(<WithdrawPage />)
    expect(await screen.findByText('50 cNGN')).toBeInTheDocument()
    expect(screen.getByText('Paid out')).toBeInTheDocument()
  })

  it('shows an asset selector when multiple assets have balances', async () => {
    mockGetBalances.mockResolvedValue([
      balance('cNGN', 10_000_000_000n),
      balance('cKES', 5_000_000_000n),
    ])
    render(<WithdrawPage />)
    expect(await screen.findByText('Asset')).toBeInTheDocument()
  })

  it('rejects an amount with more than two decimals', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '0.001')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(
      await screen.findByText('Amount must have at most 2 decimal places.')
    ).toBeInTheDocument()
  })

  it('rejects an amount below the minimum', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '0.01')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('The smallest cash-out is 50 cNGN.')).toBeInTheDocument()
  })

  it('rejects an amount above the available balance', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 100_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '1000')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('That is more than your available balance.')).toBeInTheDocument()
  })

  it('requires a bank before submitting', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('Choose your bank.')).toBeInTheDocument()
  })

  it('requires a full account number', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })
    await user.type(screen.getByLabelText('Account number'), '123')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('Account numbers are 10 digits.')).toBeInTheDocument()
  })

  it('submits a valid cash-out', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)

    await screen.findByRole('heading', { name: 'Cash out' })

    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })
    await user.type(screen.getByLabelText('Account number'), '0123456789')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))

    await waitFor(() =>
      expect(mockCreateWithdrawal).toHaveBeenCalledWith(
        'test-token',
        500_000_000n,
        '044',
        '0123456789',
        'cNGN'
      )
    )
  })
})
