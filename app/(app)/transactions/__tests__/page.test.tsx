import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import TransactionsPage from '../page'
import { api, ApiError } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'

jest.mock('@/lib/api', () => ({
  api: {
    listTransactions: jest.fn(),
    getBalances: jest.fn(),
    listRefunds: jest.fn(),
    createRefund: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

jest.mock('@/lib/csv', () => ({
  ...jest.requireActual('@/lib/csv'),
  downloadCsv: jest.fn(),
}))

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

const mockListTransactions = api.listTransactions as jest.Mock
const mockGetBalances = api.getBalances as jest.Mock
const mockListRefunds = api.listRefunds as jest.Mock
const mockCreateRefund = api.createRefund as jest.Mock

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    merchant_id: 'merchant-1',
    wallet_id: 'wallet-1',
    wallet_address: 'GABCDEF1234567890',
    tx_hash: 'tx-hash',
    amount_stroops: 10_000_000n,
    asset: 'XLM',
    network: 'stellar',
    status: 'confirmed',
    confirmations: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockListTransactions.mockResolvedValue([payment()])
  mockGetBalances.mockResolvedValue([])
  mockListRefunds.mockResolvedValue([])
  mockCreateRefund.mockResolvedValue({
    id: 'refund-1',
    payment_id: 'payment-1',
    merchant_id: 'merchant-1',
    amount_stroops: 5_000_000n,
    asset: 'XLM',
    status: 'pending',
    recipient: 'GRECIPIENT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
})

describe('TransactionsPage', () => {
  it('opens the refund dialog and calls createRefund with the expected arguments', async () => {
    const user = userEvent.setup()
    render(<TransactionsPage />)

    await screen.findByText('Refund')
    await user.click(screen.getByRole('button', { name: 'Refund' }))

    expect(screen.getByRole('heading', { name: 'Refund payment' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Refund amount'))
    await user.type(screen.getByLabelText('Refund amount'), '0.5')
    await user.clear(screen.getByLabelText('Recipient address'))
    await user.type(screen.getByLabelText('Recipient address'), 'GRECIPIENT')
    await user.type(screen.getByLabelText('Reason (optional)'), 'Customer request')
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }))

    await waitFor(() =>
      expect(mockCreateRefund).toHaveBeenCalledWith(
        'test-token',
        'payment-1',
        5_000_000n,
        'GRECIPIENT',
        'Customer request'
      )
    )
  })

  it('shows the refund success and error feedback when the API fails', async () => {
    const user = userEvent.setup()
    mockCreateRefund.mockRejectedValueOnce(new Error('Refund not allowed'))
    render(<TransactionsPage />)

    await screen.findByText('Refund')
    await user.click(screen.getByRole('button', { name: 'Refund' }))
    await user.clear(screen.getByLabelText('Refund amount'))
    await user.type(screen.getByLabelText('Refund amount'), '0.5')
    await user.clear(screen.getByLabelText('Recipient address'))
    await user.type(screen.getByLabelText('Recipient address'), 'GRECIPIENT')
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }))

    expect(await screen.findByText('Refund not allowed')).toBeInTheDocument()

    mockCreateRefund.mockResolvedValueOnce({
      id: 'refund-2',
      payment_id: 'payment-1',
      merchant_id: 'merchant-1',
      amount_stroops: 5_000_000n,
      asset: 'XLM',
      status: 'pending',
      recipient: 'GRECIPIENT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await user.clear(screen.getByLabelText('Refund amount'))
    await user.type(screen.getByLabelText('Refund amount'), '0.5')
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }))

    await waitFor(() =>
      expect(screen.getByText(/Refund requested successfully/i)).toBeInTheDocument()
    )
  })
})

describe('TransactionsPage filters, refunds list and errors', () => {
  const confirmed = payment({
    id: 'p-confirmed',
    amount_stroops: 10_000_000n,
    tx_hash: 'hash-confirmed',
  })
  const failed = payment({
    id: 'p-failed',
    status: 'failed',
    amount_stroops: 20_000_000n,
    tx_hash: 'hash-failed',
    wallet_address: 'GFAILEDWALLET',
  })

  it('filters the list by status', async () => {
    mockListTransactions.mockResolvedValue([confirmed, failed])
    render(<TransactionsPage />)

    expect(await screen.findByText('2 XLM')).toBeInTheDocument()
    expect(screen.getByText('1 XLM')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } })

    expect(screen.getByText('2 XLM')).toBeInTheDocument()
    expect(screen.queryByText('1 XLM')).not.toBeInTheDocument()
  })

  it('filters the list by search text after the debounce', async () => {
    mockListTransactions.mockResolvedValue([confirmed, failed])
    const user = userEvent.setup()
    render(<TransactionsPage />)
    await screen.findByText('2 XLM')

    await user.type(screen.getByLabelText('Search'), 'GFAILED')

    await waitFor(() => expect(screen.queryByText('1 XLM')).not.toBeInTheDocument())
    expect(screen.getByText('2 XLM')).toBeInTheDocument()
  })

  it('filters the list by date range', async () => {
    mockListTransactions.mockResolvedValue([confirmed, failed])
    render(<TransactionsPage />)
    await screen.findByText('2 XLM')

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2999-01-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2999-12-31' } })

    expect(screen.queryByText('1 XLM')).not.toBeInTheDocument()
    expect(screen.queryByText('2 XLM')).not.toBeInTheDocument()
  })

  it.each([
    ['abc', 'GRECIPIENT', 'Enter a valid refund amount.'],
    ['5', 'GRECIPIENT', 'Refund amount cannot exceed the original payment amount.'],
    ['0.5', '   ', 'Recipient address is required.'],
  ])('rejects a refund of %p to %p', async (amount, recipient, message) => {
    const user = userEvent.setup()
    render(<TransactionsPage />)

    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    await user.clear(screen.getByLabelText('Refund amount'))
    await user.type(screen.getByLabelText('Refund amount'), amount)
    await user.clear(screen.getByLabelText('Recipient address'))
    await user.type(screen.getByLabelText('Recipient address'), recipient)
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(mockCreateRefund).not.toHaveBeenCalled()
  })

  it('exports the filtered payments as CSV', async () => {
    mockListTransactions.mockResolvedValue([
      payment(),
      payment({ id: 'payment-2', status: 'detected', amount_stroops: 25_000_000n }),
    ])
    render(<TransactionsPage />)

    fireEvent.click(await screen.findByRole('button', { name: /export csv/i }))

    const [filename, csv] = (downloadCsv as jest.Mock).mock.calls[0]
    expect(filename).toMatch(/^aframp-payments-\d{4}-\d{2}-\d{2}\.csv$/)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Date,Amount,Asset,Status,Transaction hash,From wallet')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain(',1,XLM,Paid,tx-hash,GABCDEF1234567890')
    expect(lines[2]).toContain(',2.5,XLM,Incoming,')
  })

  it('lists existing refunds', async () => {
    mockListRefunds.mockResolvedValue([
      {
        id: 'refund-9',
        payment_id: 'payment-1',
        merchant_id: 'merchant-1',
        amount_stroops: 30_000_000n,
        asset: 'XLM',
        status: 'completed',
        recipient: 'GRECIPIENT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    render(<TransactionsPage />)

    expect(await screen.findByText('3 XLM')).toBeInTheDocument()
    expect(screen.getByLabelText('Refund status: completed')).toBeInTheDocument()
    expect(screen.queryByText('No refunds yet.')).not.toBeInTheDocument()
  })

  it('shows the offline message when the backend is unreachable', async () => {
    mockListTransactions.mockRejectedValue(new ApiError('offline', 0))
    render(<TransactionsPage />)
    expect(await screen.findByText(/can't connect to the payment server/i)).toBeInTheDocument()
  })

  it('shows other load errors as-is', async () => {
    mockListTransactions.mockRejectedValue(new Error('boom'))
    render(<TransactionsPage />)
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
