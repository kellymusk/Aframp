import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChargePage from '../page'
import { calculateFiatEquivalent } from '@/lib/charge'
import { api, ApiError } from '@/lib/api'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token', userId: 'u-1', merchantId: 'm-1' }),
}))

jest.mock('@/lib/api', () => {
  class MockApiError extends Error {
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
      createPaymentRequest: jest.fn(),
    },
    ApiError: MockApiError,
  }
})

const mockCreatePaymentRequest = api.createPaymentRequest as jest.Mock

describe('calculateFiatEquivalent', () => {
  it('returns ≈ ₦0 for empty, zero, or invalid amounts', () => {
    expect(calculateFiatEquivalent('', 250)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('0', 250)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('abc', 250)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('-10', 250)).toBe('≈ ₦0')
  })

  it('formats whole number conversions correctly with thousands separators', () => {
    expect(calculateFiatEquivalent('50', 249)).toBe('≈ ₦12,450')
    expect(calculateFiatEquivalent('1000', 300)).toBe('≈ ₦300,000')
  })

  it('formats fractional amounts correctly', () => {
    expect(calculateFiatEquivalent('1.5', 200)).toBe('≈ ₦300')
    expect(calculateFiatEquivalent('0.25', 100)).toBe('≈ ₦25')
  })
})

describe('ChargePage', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ stellar: { ngn: 250 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetches exchange rate on mount and displays fiat equivalent as user types', async () => {
    render(<ChargePage />)

    expect(await screen.findByText(/1 XLM ≈ ₦250/)).toBeInTheDocument()
    expect(screen.getByTestId('fiat-equivalent')).toHaveTextContent('≈ ₦0')

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    expect(screen.getByTestId('fiat-equivalent')).toHaveTextContent('≈ ₦12,500')
  })

  it('handles keypad interactions: decimals, fraction limits, backspace', async () => {
    render(<ChargePage />)
    await screen.findByText(/1 XLM ≈ ₦250/)

    const amountDisplay = screen.getByTestId('charge-amount')

    // Press .
    fireEvent.click(screen.getByRole('button', { name: '.' }))
    expect(amountDisplay).toHaveTextContent('0.')

    // Press . again (should ignore second dot)
    fireEvent.click(screen.getByRole('button', { name: '.' }))
    expect(amountDisplay).toHaveTextContent('0.')

    // Press 5
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(amountDisplay).toHaveTextContent('0.5')

    // Press backspace
    fireEvent.click(screen.getByRole('button', { name: 'Delete last digit' }))
    expect(amountDisplay).toHaveTextContent('0.')

    // Press backspace again
    fireEvent.click(screen.getByRole('button', { name: 'Delete last digit' }))
    expect(amountDisplay).toHaveTextContent('0')

    // Leading 0 then digit replaces 0
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    expect(amountDisplay).toHaveTextContent('7')
  })

  it('limits decimal fraction digits to DECIMALS (7)', async () => {
    render(<ChargePage />)
    await screen.findByText(/1 XLM ≈ ₦250/)

    const amountDisplay = screen.getByTestId('charge-amount')

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '.' }))
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
    }
    expect(amountDisplay).toHaveTextContent('1.1111111')

    // 8th fraction digit should be ignored
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(amountDisplay).toHaveTextContent('1.1111111')
  })

  it('supports manual rate refresh button', async () => {
    render(<ChargePage />)
    await screen.findByText(/1 XLM ≈ ₦250/)

    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ stellar: { ngn: 300 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const refreshButton = screen.getByRole('button', { name: 'Refresh exchange rate' })
    fireEvent.click(refreshButton)

    expect(await screen.findByText(/1 XLM ≈ ₦300/)).toBeInTheDocument()
  })

  it('falls back to cached rate and shows "Rate may be stale" warning on refresh error', async () => {
    render(<ChargePage />)
    await screen.findByText(/1 XLM ≈ ₦250/)

    global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'))

    const refreshButton = screen.getByRole('button', { name: 'Refresh exchange rate' })
    fireEvent.click(refreshButton)

    const warning = await screen.findByTestId('stale-warning')
    expect(warning).toHaveTextContent(/rate may be stale/i)
    expect(screen.getByText(/1 XLM ≈ ₦250/)).toBeInTheDocument()
  })

  it('displays rate unavailable when initial rate fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed initial fetch'))

    render(<ChargePage />)

    expect(await screen.findByText('Rate unavailable')).toBeInTheDocument()
    expect(await screen.findByText('Unable to load current exchange rate')).toBeInTheDocument()
  })

  it('submits a payment request successfully with allowPartial option', async () => {
    const user = userEvent.setup()
    mockCreatePaymentRequest.mockResolvedValue({ id: 'req-456' })

    render(<ChargePage />)
    await screen.findByText(/1 XLM ≈ ₦250/)

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    const allowPartialCheckbox = screen.getByLabelText('Allow partial payment')
    await user.click(allowPartialCheckbox)

    const submitButton = screen.getByRole('button', { name: 'Show payment code' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreatePaymentRequest).toHaveBeenCalledWith(
        'test-token',
        500_000_000n,
        'XLM',
        undefined,
        true
      )
      expect(mockPush).toHaveBeenCalledWith('/request/req-456')
    })
  })

  it('handles wallet configuration error when creating a charge', async () => {
    const user = userEvent.setup()
    mockCreatePaymentRequest.mockRejectedValue(
      new ApiError('You need to create a wallet before accepting payments', 400)
    )

    render(<ChargePage />)
    await screen.findByText(/1 XLM ≈ ₦250/)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    const submitButton = screen.getByRole('button', { name: 'Show payment code' })
    await user.click(submitButton)

    expect(
      await screen.findByText('Set up your payment address first, then come back here.')
    ).toBeInTheDocument()
  })

  it('handles generic error when creating a charge', async () => {
    const user = userEvent.setup()
    mockCreatePaymentRequest.mockRejectedValue(new Error('Payment gateway error'))

    render(<ChargePage />)
    await screen.findByText(/1 XLM ≈ ₦250/)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    const submitButton = screen.getByRole('button', { name: 'Show payment code' })
    await user.click(submitButton)

    expect(await screen.findByText('Payment gateway error')).toBeInTheDocument()
  })

  it('decrements countdown timer and triggers refresh when countdown hits zero', async () => {
    // A plain response: undici's Response.json() doesn't settle while fake
    // timers are installed, which would leave the refresh hanging.
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ stellar: { ngn: 250 } }) })
    ) as unknown as typeof fetch
    jest.useFakeTimers()
    try {
      render(<ChargePage />)
      // Let the initial rate load settle before the clock starts moving.
      await act(async () => {
        await Promise.resolve()
      })
      expect(screen.getByText(/1 XLM ≈ ₦250/)).toBeInTheDocument()
      expect(screen.getByText(/Refresh in 30s/)).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(screen.getByText(/Refresh in 28s/)).toBeInTheDocument()

      await act(async () => {
        jest.advanceTimersByTime(28000)
        await Promise.resolve()
      })

      expect(global.fetch).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })
})
