import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api, ApiError } from '@/lib/api'
import SendPage from '../page'

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
      listRemittances: jest.fn(),
      getRemittanceFeeEstimate: jest.fn(),
      createRemittance: jest.fn(),
    },
    ApiError,
  }
})

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

const mockGetBalances = api.getBalances as jest.Mock
const mockListRemittances = api.listRemittances as jest.Mock
const mockGetFee = api.getRemittanceFeeEstimate as jest.Mock
const mockCreateRemittance = api.createRemittance as jest.Mock

/** A syntactically valid 56-character Stellar address. */
const VALID_ADDRESS = `G${'A'.repeat(55)}`

function balance(asset: string, available: bigint) {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

function remittance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    merchant_id: 'm',
    destination_address: VALID_ADDRESS,
    amount_stroops: 50_000_000n,
    asset: 'XLM',
    memo: null,
    status: 'confirmed',
    tx_hash: null,
    failure_reason: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  mockGetBalances.mockResolvedValue([])
  mockListRemittances.mockResolvedValue([])
  mockGetFee.mockResolvedValue({ fee_stroops: 0n, network_fee_stroops: 0n, total_stroops: 0n })
  mockCreateRemittance.mockResolvedValue({})
})

describe('SendPage', () => {
  it('shows a spinner until balances resolve', () => {
    mockGetBalances.mockReturnValue(new Promise(() => {}))
    mockListRemittances.mockReturnValue(new Promise(() => {}))

    render(<SendPage />)

    expect(screen.queryByRole('heading', { name: 'Send money' })).not.toBeInTheDocument()
  })

  it('renders the form and available balance once loaded', async () => {
    mockGetBalances.mockResolvedValue([balance('XLM', 2_500_000_000n)])

    render(<SendPage />)

    expect(await screen.findByRole('heading', { name: 'Send money' })).toBeInTheDocument()
    expect(screen.getByText('250 XLM available')).toBeInTheDocument()
  })

  it('surfaces a load error when the backend fails', async () => {
    mockGetBalances.mockRejectedValue(new ApiError('boom', 500))

    render(<SendPage />)

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('fetches and displays the fee estimate after an amount is entered', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])
    mockGetFee.mockResolvedValue({
      fee_stroops: 1_000_000n,
      network_fee_stroops: 100n,
      total_stroops: 21_000_000n,
    })

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/amount/i), '2')

    await waitFor(() => expect(mockGetFee).toHaveBeenCalledWith('test-token', 20_000_000n, 'XLM'), {
      timeout: 3000,
    })
    expect(await screen.findByText('Fee')).toBeInTheDocument()
    expect(screen.getByText('2.1 XLM')).toBeInTheDocument() // total_stroops
  })

  it('debounces the fee lookup into a single request', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/amount/i), '123')

    await waitFor(() => expect(mockGetFee).toHaveBeenCalledTimes(1), { timeout: 3000 })
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(mockGetFee).toHaveBeenCalledTimes(1)
  })

  it('shows "Fee estimate unavailable" and keeps the send usable when the estimate fails', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])
    mockGetFee.mockRejectedValue(new ApiError('estimate offline', 503))

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/recipient stellar address/i), VALID_ADDRESS)
    await user.type(screen.getByLabelText(/amount/i), '2')

    expect(await screen.findByRole('status')).toHaveTextContent(/fee estimate unavailable/i)
    // The fee breakdown is gone, but the primary action is not blocked.
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send money/i })).toBeEnabled()
  })

  it('re-requests the fee when the asset changes', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n), balance('cNGN', 1n)])

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/amount/i), '2')
    await waitFor(() => expect(mockGetFee).toHaveBeenCalledWith('test-token', 20_000_000n, 'XLM'), {
      timeout: 3000,
    })

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cNGN' } })

    await waitFor(
      () => expect(mockGetFee).toHaveBeenCalledWith('test-token', 20_000_000n, 'cNGN'),
      { timeout: 3000 }
    )
  })

  it('refuses an amount that is not a whole number of stroops', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/recipient stellar address/i), VALID_ADDRESS)
    await user.type(screen.getByLabelText(/amount/i), '0.001')
    await user.click(screen.getByRole('button', { name: /send money/i }))

    expect(await screen.findByText('Amount must be a whole number of stroops.')).toBeInTheDocument()
    expect(mockCreateRemittance).not.toHaveBeenCalled()
  })

  it('refuses an amount above the available balance', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 1_000_000n)])

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/recipient stellar address/i), VALID_ADDRESS)
    await user.type(screen.getByLabelText(/amount/i), '5')
    await user.click(screen.getByRole('button', { name: /send money/i }))

    expect(await screen.findByText('That is more than your available balance.')).toBeInTheDocument()
    expect(mockCreateRemittance).not.toHaveBeenCalled()
  })

  it('submits a valid remittance and reloads the list', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/recipient stellar address/i), VALID_ADDRESS)
    await user.type(screen.getByLabelText(/amount/i), '2')
    await user.type(screen.getByLabelText(/memo/i), 'hello')
    await user.click(screen.getByRole('button', { name: /send money/i }))

    await waitFor(() =>
      expect(mockCreateRemittance).toHaveBeenCalledWith(
        'test-token',
        VALID_ADDRESS,
        20_000_000n,
        'XLM',
        'hello'
      )
    )
    await waitFor(() => expect(mockGetBalances).toHaveBeenCalledTimes(2))
  })

  it('shows an error when the remittance fails to submit', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])
    mockCreateRemittance.mockRejectedValue(new ApiError('send failed', 400))

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    await user.type(screen.getByLabelText(/recipient stellar address/i), VALID_ADDRESS)
    await user.type(screen.getByLabelText(/amount/i), '2')
    await user.click(screen.getByRole('button', { name: /send money/i }))

    expect(await screen.findByText('send failed')).toBeInTheDocument()
  })

  it('proposes saved contacts and fills the address when one is chosen', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      'aframp_contacts',
      JSON.stringify([{ id: 'c1', name: 'Ada', address: VALID_ADDRESS, createdAt: '' }])
    )
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    const addressInput = screen.getByLabelText(/recipient stellar address/i)
    await user.click(addressInput)
    await user.click(await screen.findByText('Ada'))

    expect(addressInput).toHaveValue(VALID_ADDRESS)
  })

  it('renders recent sends with an explorer link and failure reason', async () => {
    mockGetBalances.mockResolvedValue([balance('XLM', 10_000_000_000n)])
    mockListRemittances.mockResolvedValue([
      remittance({ id: 'r1', status: 'confirmed', tx_hash: 'abc123' }),
      remittance({
        id: 'r2',
        status: 'failed',
        tx_hash: null,
        failure_reason: 'Insufficient funds',
      }),
    ])

    render(<SendPage />)
    await screen.findByRole('heading', { name: 'Send money' })

    expect(await screen.findByText('View on Stellar Explorer')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Insufficient funds')).toBeInTheDocument()
  })
})
