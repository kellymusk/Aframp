import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import type { ChangeEvent, ReactElement, ReactNode } from 'react'
import { api, ApiError, type Balance, type Withdrawal } from '@/lib/api'
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
      getMe: jest.fn(),
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
  const React = jest.requireActual<typeof import('react')>('react')
  type SelectNodeProps = { id?: string; value?: string; children?: ReactNode }
  type SelectNode = ReactElement<SelectNodeProps>
  type SelectMockProps = {
    value?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
    children?: ReactNode
  }

  const SelectTrigger = ({ id, children }: { id?: string; children?: ReactNode }) =>
    React.createElement('div', { id, 'data-select-trigger': true }, children)

  const SelectValue = ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', null, placeholder ?? '')

  const SelectItem = ({ value, children }: { value: string; children?: ReactNode }) =>
    React.createElement('option', { value }, children)

  const SelectContent = ({ children }: { children?: ReactNode }) =>
    React.createElement(React.Fragment, null, children)

  const flattenOptions = (nodes: ReactNode): SelectNode[] =>
    React.Children.toArray(nodes).flatMap((node): SelectNode[] => {
      if (!React.isValidElement<SelectNodeProps>(node)) return []
      if (node.type === SelectItem) return [node]
      if (node.type === SelectContent) return flattenOptions(node.props.children)
      if (node.props?.children) return flattenOptions(node.props.children)
      return []
    })

  return {
    Select: ({ value, onValueChange, disabled, children }: SelectMockProps) => {
      const trigger = React.Children.toArray(children).find(
        (child): child is SelectNode =>
          React.isValidElement<SelectNodeProps>(child) && child.type === SelectTrigger
      )
      const options = flattenOptions(children).map((option) =>
        React.createElement(
          'option',
          { key: option.props.value, value: option.props.value },
          option.props.children
        )
      )

      return React.createElement(
        'select',
        {
          id: trigger?.props.id,
          value: value ?? '',
          disabled,
          onChange: (event: ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(event.currentTarget.value),
          role: 'combobox',
          'aria-expanded': 'false',
          'aria-controls': `${trigger?.props.id ?? 'select'}-list`,
        },
        options
      )
    },
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  }
})

const mockGetMe = jest.mocked(api.getMe)
const mockGetBalances = jest.mocked(api.getBalances)
const mockListWithdrawals = jest.mocked(api.listWithdrawals)
const mockCreateWithdrawal = jest.mocked(api.createWithdrawal)

function balance(asset: string, available: bigint): Balance {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

function withdrawal(overrides: Partial<Withdrawal> = {}): Withdrawal {
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
  mockGetMe.mockResolvedValue({
    user_id: 'u',
    email: 'user@example.com',
    name: 'Test User',
    is_admin: false,
    created_at: '',
    merchant_id: 'm',
    merchant_name: 'Test Merchant',
    kyc_status: 'approved',
  })
  mockGetBalances.mockResolvedValue([])
  mockListWithdrawals.mockResolvedValue([])
  mockCreateWithdrawal.mockResolvedValue(withdrawal())
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

  it('has no accessibility violations in the cash-out form', async () => {
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    const { container } = render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })

    expect(await axe(container)).toHaveNoViolations()
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
    await user.click(await screen.findByRole('button', { name: 'Confirm cash out' }))

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
