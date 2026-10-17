import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ChangeEvent, ReactNode } from 'react'
import { api } from '@/lib/api'
import { ZarOnramp } from '../zar-onramp'
import { redirectTo } from '@/lib/navigation'

jest.mock('@/lib/navigation', () => ({ redirectTo: jest.fn() }))

jest.mock('@/lib/api', () => ({
  api: {
    createOzowPayment: jest.fn(),
    verifyOzowPayment: jest.fn(),
  },
}))

jest.mock('@/lib/payment-providers', () => ({
  OZOW_BANKS: [{ code: 'ABSA', name: 'ABSA Bank' }],
  calculateFees: () => ({ processingFee: 1.5, totalCost: 101.5 }),
  formatCurrency: (amount: number, currency: string) => `${currency} ${amount}`,
}))

// Mock Select so we can drive it with simple DOM events in jsdom.
jest.mock('@/components/ui/select', () => {
  const React = jest.requireActual('react')
  type SelectMockProps = {
    value?: string
    onValueChange?: (value: string) => void
    children?: ReactNode
  }
  type SelectItemMockProps = { value: string; children?: ReactNode }

  return {
    Select: ({ value, onValueChange, children }: SelectMockProps) =>
      React.createElement(
        'select',
        {
          value,
          onChange: (event: ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(event.currentTarget.value),
          'data-testid': 'bank-select',
        },
        children
      ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: ReactNode }) => children,
    SelectItem: ({ value, children }: SelectItemMockProps) =>
      React.createElement('option', { value }, children),
  }
})

const mockCreateOzowPayment = api.createOzowPayment as jest.Mock

const mockRedirectTo = redirectTo as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  render(<ZarOnramp token="test-token" />)
  await user.type(screen.getByLabelText('Amount (ZAR)'), '100')
  fireEvent.change(screen.getByTestId('bank-select'), { target: { value: 'ABSA' } })
  await user.click(screen.getByRole('button', { name: /continue to ozow/i }))
}

describe('ZarOnramp – payment_url validation (#639)', () => {
  it('redirects to a valid https://ozow.com URL', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'https://pay.ozow.com/initiate?token=abc',
    })

    await fillAndSubmit(user)

    await waitFor(() =>
      expect(mockRedirectTo).toHaveBeenCalledWith('https://pay.ozow.com/initiate?token=abc')
    )
  })

  it('rejects a javascript: URL and shows an error', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'javascript:alert(1)',
    })

    await fillAndSubmit(user)

    // javascript: parses as a URL, so it's caught by the protocol check.
    expect(await screen.findByText(/Payment URL failed security validation/i)).toBeInTheDocument()
    expect(mockRedirectTo).not.toHaveBeenCalled()
  })

  it('rejects an http:// (non-https) URL and shows an error', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'http://pay.ozow.com/initiate',
    })

    await fillAndSubmit(user)

    expect(await screen.findByText(/Payment URL failed security validation/i)).toBeInTheDocument()
    expect(mockRedirectTo).not.toHaveBeenCalled()
  })

  it('rejects a URL on a non-Ozow domain and shows an error', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'https://evil.example.com/steal',
    })

    await fillAndSubmit(user)

    expect(await screen.findByText(/Payment URL failed security validation/i)).toBeInTheDocument()
    expect(mockRedirectTo).not.toHaveBeenCalled()
  })
})

describe('ZarOnramp – unparsable payment_url', () => {
  it('shows an error for a payment URL that is not a URL at all', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({ payment_url: 'not a url', transaction_id: 'tx-1' })

    await fillAndSubmit(user)

    expect(await screen.findByText(/Invalid payment URL received from server/i)).toBeInTheDocument()
    expect(mockRedirectTo).not.toHaveBeenCalled()
  })
})

describe('ZarOnramp – verifying the payment after the Ozow redirect', () => {
  const mockVerify = api.verifyOzowPayment as jest.Mock

  beforeEach(() => {
    window.history.pushState({}, '', '/charge?provider=ozow')
    sessionStorage.setItem('ozow_transaction_id', 'tx-123')
  })

  afterEach(() => {
    window.history.pushState({}, '', '/')
    sessionStorage.clear()
  })

  it('reports success and clears the stored transaction id', async () => {
    const onSuccess = jest.fn()
    mockVerify.mockResolvedValue({ status: 'completed', tx_hash: 'hash-abc' })

    render(<ZarOnramp token="test-token" onSuccess={onSuccess} />)

    expect(screen.getByText('Verifying your payment...')).toBeInTheDocument()
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('hash-abc'))
    expect(mockVerify).toHaveBeenCalledWith('test-token', 'tx-123')
    expect(sessionStorage.getItem('ozow_transaction_id')).toBeNull()
  })

  it('shows an error when the payment failed', async () => {
    mockVerify.mockResolvedValue({ status: 'failed' })
    render(<ZarOnramp token="test-token" />)

    expect(await screen.findByText('Payment failed. Please try again.')).toBeInTheDocument()
    expect(sessionStorage.getItem('ozow_transaction_id')).toBeNull()
  })

  it('keeps the transaction id while the payment is still pending', async () => {
    mockVerify.mockResolvedValue({ status: 'pending' })
    render(<ZarOnramp token="test-token" />)

    await waitFor(() =>
      expect(screen.queryByText('Verifying your payment...')).not.toBeInTheDocument()
    )
    expect(sessionStorage.getItem('ozow_transaction_id')).toBe('tx-123')
  })

  it('shows the verification error', async () => {
    mockVerify.mockRejectedValue(new Error('verify down'))
    render(<ZarOnramp token="test-token" />)
    expect(await screen.findByText('verify down')).toBeInTheDocument()
  })

  it('does nothing without a stored transaction id', () => {
    sessionStorage.clear()
    render(<ZarOnramp token="test-token" />)
    expect(mockVerify).not.toHaveBeenCalled()
  })
})
