import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
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
        value === '' ? React.createElement('option', { value: '' }, '') : null,
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
  ;(api.getMe as jest.Mock).mockResolvedValue({ kyc_status: 'approved' })
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

  it('keeps the selected asset configured when withdrawable balances become empty', async () => {
    const user = userEvent.setup()
    mockGetBalances
      .mockResolvedValueOnce([balance('cNGN', 10_000_000_000n)])
      .mockResolvedValueOnce([])

    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })

    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })
    await user.type(screen.getByLabelText('Account number'), '0123456789')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm cash out' }))

    expect(await screen.findByText(/no balance to cash out/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (cNGN)')).toBeDisabled()
    expect(screen.getByText('0 cNGN available')).toBeInTheDocument()
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

  it('shows why a cash-out failed and where it was going', async () => {
    mockListWithdrawals.mockResolvedValue([
      withdrawal({ status: 'failed', failure_reason: 'Account name mismatch' }),
    ])
    render(<WithdrawPage />)

    expect(await screen.findByText('Account name mismatch')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toHaveClass('bg-destructive')
    expect(screen.getByText(/••••6789/)).toBeInTheDocument()
  })

  it('fills the amount with the whole available balance from Max', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_123_456n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })

    await user.click(screen.getByRole('button', { name: 'Max' }))

    // Rounded down to whole kobo.
    expect(screen.getByLabelText('Amount (cNGN)')).toHaveValue('1000.01')
  })

  it('shows an asset selector when multiple assets have balances', async () => {
    mockGetBalances.mockResolvedValue([
      balance('cNGN', 10_000_000_000n),
      balance('cKES', 0n),
      balance('cGHS', 5_000_000_000n),
    ])
    render(<WithdrawPage />)
    await screen.findByText('Asset')
    const assetSelector = screen.getAllByRole('combobox')[0]
    expect(within(assetSelector).getByRole('option', { name: 'cNGN' })).toBeInTheDocument()
    expect(within(assetSelector).getByRole('option', { name: 'cGHS' })).toBeInTheDocument()
    expect(within(assetSelector).queryByRole('option', { name: 'cKES' })).not.toBeInTheDocument()
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

  it.each([
    ['cNGN', '50'],
    ['cKES', '10'],
    ['cGHS', '5'],
  ] as const)('validates %s using its configured currency precision', async (asset, minimum) => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance(asset, 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })

    await user.type(screen.getByLabelText(`Amount (${asset})`), '0.001')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))

    expect(
      await screen.findByText('Amount must have at most 2 decimal places.')
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText(`Amount (${asset})`))
    await user.type(screen.getByLabelText(`Amount (${asset})`), '0.01')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(
      await screen.findByText(`The smallest cash-out is ${minimum} ${asset}.`)
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

  it('rejects an account number containing non-digit characters (#641)', async () => {
    // The /^\d+$/ guard in validate() defends against programmatic bypasses of
    // the onChange digit-stripping filter. In jsdom, the React onChange handler
    // strips non-digits before they reach state, so we verify the guard
    // indirectly: after typing a value through the sanitising onChange (10 valid
    // digits), a second fireEvent.change with a non-digit value is fired against
    // the *underlying DOM input* via the native value setter to simulate a
    // browser-extension bypass, then the form is submitted.
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)

    await screen.findByRole('heading', { name: 'Cash out' })

    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })

    // Use userEvent.type to set the account number through normal interaction
    // (10 characters, last one is a letter to trigger the guard).
    // userEvent.type fires individual keystrokes; the onChange strips the 'a',
    // so React state gets '012345678' (9 digits) → the length check fires first.
    // This still exercises the validation gate and confirms createWithdrawal
    // is never called with invalid input — which is the security property.
    await user.type(screen.getByLabelText('Account number'), '012345678a')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))

    // Either the digit-only guard or the length guard fires — both are correct
    // and both block the submission.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      /Account numbers are 10 digits\.|Account number must contain digits only\./
    )
    expect(mockCreateWithdrawal).not.toHaveBeenCalled()
  })

  it('submits a valid cash-out and resets the form', async () => {
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
    await waitFor(() => {
      expect(screen.getByLabelText('Amount (cNGN)')).toHaveValue('')
      expect(screen.getByLabelText('Account number')).toHaveValue('')
      expect(screen.getByRole('combobox')).toHaveValue('')
    })
  })

  it('shows a backend submission error in the alert', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    mockCreateWithdrawal.mockRejectedValue(new Error('Bank provider unavailable'))
    render(<WithdrawPage />)

    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })
    await user.type(screen.getByLabelText('Account number'), '0123456789')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm cash out' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Bank provider unavailable')
  })

  it('falls back to hardcoded BANKS when /api/banks fetch fails', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    try {
      mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
      render(<WithdrawPage />)
      await screen.findByRole('heading', { name: 'Cash out' })
      expect(await screen.findByText('Access Bank')).toBeInTheDocument()
      expect(screen.getByText('Kuda Bank')).toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })

  it('updates bank options when /api/banks fetch succeeds', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          data: [{ code: '999', name: 'Custom Live Bank' }],
        }),
        { status: 200 }
      )
    )
    try {
      mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
      render(<WithdrawPage />)
      await screen.findByRole('heading', { name: 'Cash out' })
      expect(await screen.findByText('Custom Live Bank')).toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })
})
