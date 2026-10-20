import { Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'
import PaymentRequestPage from '../page'
import { api, ApiError, type PaymentRequest } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  api: {
    getPaymentRequest: jest.fn(),
  },
  ApiError: class extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

// Mock react-qr-code
jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}))

const mockGetPaymentRequest = api.getPaymentRequest as jest.Mock

/** The page unwraps `params` with React's use(), which suspends on first render. */
async function renderPage(id = 'request-123') {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <Suspense fallback={null}>
        <PaymentRequestPage params={Promise.resolve({ id })} />
      </Suspense>
    )
    await Promise.resolve()
  })
  return result
}

/**
 * Advances fake timers and lets every microtask queued by them (the async
 * poll tick's awaited `load()`, the resulting state updates) settle before
 * returning, so timer-driven updates stay wrapped in `act`.
 */
async function advanceTimers(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms)
  })
}

const createMockRequest = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
  id: 'request-123',
  merchant_id: 'merchant-123',
  address: 'GTEST123',
  network: 'stellar',
  amount_stroops: 25000000n,
  asset: 'XLM',
  memo: 'test-memo',
  status: 'pending',
  expires_at: new Date(Date.now() + 600000).toISOString(),
  created_at: new Date().toISOString(),
  sep7_uri: 'web+stellar:pay?destination=GTEST123&amount=2.5',
  ...overrides,
})

describe('PaymentRequestPage', () => {
  beforeEach(() => {
    mockGetPaymentRequest.mockReset()
    jest.useFakeTimers()
  })

  afterEach(() => {
    // Discard anything still scheduled before restoring real timers, so a
    // leftover poll/countdown timer can't fire — and warn — in a later test.
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('loading state', () => {
    it('shows loading spinner while fetching payment request', async () => {
      mockGetPaymentRequest.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      await renderPage()

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('loads and displays the payment request', async () => {
      mockGetPaymentRequest.mockResolvedValue(createMockRequest())

      await renderPage()

      expect(await screen.findByText('2.5 XLM')).toBeInTheDocument()
      expect(screen.getByText('GTEST123')).toBeInTheDocument()
      expect(screen.getByText('test-memo')).toBeInTheDocument()
    })
  })

  describe('pending state', () => {
    it('displays QR code for pending request with sep7_uri', async () => {
      mockGetPaymentRequest.mockResolvedValue(createMockRequest())

      await renderPage()

      expect(await screen.findByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByText(/Ask your customer to scan/i)).toBeInTheDocument()
    })

    it('shows warning when sep7_uri is null', async () => {
      mockGetPaymentRequest.mockResolvedValue(createMockRequest({ sep7_uri: null }))

      await renderPage()

      expect(await screen.findByText(/No scannable code for XLM yet/i)).toBeInTheDocument()
    })

    it('displays countdown timer', async () => {
      const expiresAt = new Date(Date.now() + 65000).toISOString() // 1:05
      mockGetPaymentRequest.mockResolvedValue(createMockRequest({ expires_at: expiresAt }))

      await renderPage()

      expect(await screen.findByText(/1:0[45]/)).toBeInTheDocument()
    })

    it('polls for status updates every 3 seconds', async () => {
      mockGetPaymentRequest.mockResolvedValue(createMockRequest())

      await renderPage()

      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(1)

      await advanceTimers(3000)
      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(2)

      await advanceTimers(3000)
      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(3)
    })

    it('stops polling when status becomes paid', async () => {
      mockGetPaymentRequest
        .mockResolvedValueOnce(createMockRequest())
        .mockResolvedValueOnce(createMockRequest())
        .mockResolvedValueOnce(createMockRequest({ status: 'paid' }))

      await renderPage()

      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(1)

      await advanceTimers(3000)
      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(2)

      await advanceTimers(3000)
      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(3)

      // Should not poll again after status is paid
      await advanceTimers(3000)
      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(3)
    })

    it('stops polling when component unmounts (AbortController)', async () => {
      mockGetPaymentRequest.mockImplementation((_id: string, signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
          } else {
            signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
            setTimeout(() => resolve(createMockRequest()), 100)
          }
        })
      })

      const { unmount } = await renderPage()

      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(1)

      unmount()

      await advanceTimers(5000)

      // After unmount, no additional calls should be made
      expect(mockGetPaymentRequest).toHaveBeenCalledTimes(1)
    })

    it('shows partial payment progress when allow_partial is true', async () => {
      mockGetPaymentRequest.mockResolvedValue(
        createMockRequest({
          allow_partial: true,
          amount_paid_stroops: 10000000n, // 1 XLM paid
          amount_stroops: 25000000n, // 2.5 XLM total
        })
      )

      await renderPage()

      expect(await screen.findByText(/1 \/ 2\.5 XLM/)).toBeInTheDocument()
    })
  })

  describe('paid state', () => {
    it('shows success screen when payment is received', async () => {
      mockGetPaymentRequest.mockResolvedValue(createMockRequest({ status: 'paid' }))

      await renderPage()

      expect(await screen.findByText('Payment received')).toBeInTheDocument()
      expect(screen.getByText('2.5 XLM')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /New charge/i })).toHaveAttribute('href', '/charge')
    })

    it('transitions from pending to paid state', async () => {
      mockGetPaymentRequest
        .mockResolvedValueOnce(createMockRequest({ status: 'pending' }))
        .mockResolvedValueOnce(createMockRequest({ status: 'paid' }))

      await renderPage()

      expect(screen.getByText(/Ask your customer to scan/i)).toBeInTheDocument()

      await advanceTimers(3000)

      expect(screen.getByText('Payment received')).toBeInTheDocument()
    })
  })

  describe('expired state', () => {
    it('shows expired screen when charge times out', async () => {
      mockGetPaymentRequest.mockResolvedValue(createMockRequest({ status: 'expired' }))

      await renderPage()

      expect(await screen.findByText('Charge expired')).toBeInTheDocument()
      expect(screen.getByText(/Nobody paid 2\.5 XLM before the code ran out/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Start a new charge/i })).toHaveAttribute(
        'href',
        '/charge'
      )
    })
  })

  describe('error handling', () => {
    it('shows error screen when payment request cannot be loaded', async () => {
      mockGetPaymentRequest.mockRejectedValue(new Error('Payment request not found'))

      await renderPage()

      expect(await screen.findByText('Payment request not found')).toBeInTheDocument()
    })

    it('shows backend-down message for network errors', async () => {
      mockGetPaymentRequest.mockRejectedValue(new ApiError('Network error', 0))

      await renderPage()

      expect(await screen.findByText(/can't connect to the payment server/i)).toBeInTheDocument()
    })

    it('shows warning alert for backend-down during polling but keeps UI visible', async () => {
      mockGetPaymentRequest
        .mockResolvedValueOnce(createMockRequest())
        .mockRejectedValueOnce(new ApiError('Network error', 0))

      await renderPage()

      // Initial load succeeds
      expect(screen.getByText('2.5 XLM')).toBeInTheDocument()

      await advanceTimers(3000)

      // Should show alert but keep the QR code visible
      expect(screen.getByText(/Can't reach the payment server/i)).toBeInTheDocument()
      expect(screen.getByText('2.5 XLM')).toBeInTheDocument()
    })
  })
})
