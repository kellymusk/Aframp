import { Suspense } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import PaymentRequestPage from '../page'
import { api, type PaymentRequest } from '@/lib/api'
import { useOptionalSession } from '@/components/session-provider'

jest.mock('@/lib/api', () => ({
  api: {
    getPaymentRequest: jest.fn(),
    cancelPaymentRequest: jest.fn(),
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

jest.mock('@/components/session-provider', () => ({
  useOptionalSession: jest.fn(),
}))

jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}))

const mockGet = api.getPaymentRequest as jest.Mock
const mockCancel = api.cancelPaymentRequest as jest.Mock
const mockUseSession = useOptionalSession as jest.Mock

function pendingRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: 'req_123',
    merchant_id: 'merchant-1',
    address: 'GTEST123',
    network: 'stellar',
    amount_stroops: 25000000n,
    asset: 'XLM',
    memo: 'memo',
    status: 'pending',
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    created_at: new Date().toISOString(),
    sep7_uri: 'web+stellar:pay?destination=GTEST123&amount=2.5',
    ...overrides,
  }
}

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <PaymentRequestPage params={Promise.resolve({ id: 'req_123' })} />
      </Suspense>
    )
    await Promise.resolve()
  })
}

describe('PaymentRequestPage cancel action', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockGet.mockReset()
    mockCancel.mockReset()
    mockUseSession.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('lets the owning merchant cancel a pending request', async () => {
    mockUseSession.mockReturnValue({
      session: { token: 'tok', userId: 'u1', merchantId: 'merchant-1' },
    })
    mockGet.mockResolvedValue(pendingRequest())
    mockCancel.mockResolvedValue(pendingRequest({ status: 'cancelled' }))
    await renderPage()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cancel request/i }))
      await Promise.resolve()
    })

    expect(mockCancel).toHaveBeenCalledWith('tok', 'req_123')
    expect(screen.getByRole('heading', { name: /request cancelled/i })).toBeInTheDocument()
  })

  it('does not offer cancel to customers or to another merchant', async () => {
    mockGet.mockResolvedValue(pendingRequest())

    mockUseSession.mockReturnValue(null)
    await renderPage()
    expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument()
  })

  it('does not offer cancel to a different merchant', async () => {
    mockUseSession.mockReturnValue({
      session: { token: 'tok', userId: 'u2', merchantId: 'merchant-2' },
    })
    mockGet.mockResolvedValue(pendingRequest())
    await renderPage()
    expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument()
  })

  it('shows the cancelled state when the backend reports it', async () => {
    mockUseSession.mockReturnValue(null)
    mockGet.mockResolvedValue(pendingRequest({ status: 'cancelled' }))
    await renderPage()
    expect(screen.getByRole('heading', { name: /request cancelled/i })).toBeInTheDocument()
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
  })

  it('shows an error and keeps the request when cancelling fails', async () => {
    mockUseSession.mockReturnValue({
      session: { token: 'tok', userId: 'u1', merchantId: 'merchant-1' },
    })
    mockGet.mockResolvedValue(pendingRequest())
    mockCancel.mockRejectedValue(new Error('Only pending requests can be cancelled'))
    await renderPage()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cancel request/i }))
      await Promise.resolve()
    })

    expect(screen.getByText('Only pending requests can be cancelled')).toBeInTheDocument()
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
  })
})
