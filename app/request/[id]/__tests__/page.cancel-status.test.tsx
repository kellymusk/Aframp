import { Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'
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

function request(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
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

describe('PaymentRequestPage cancel action by status', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockGet.mockReset()
    mockCancel.mockReset()
    mockUseSession.mockReset()
    mockUseSession.mockReturnValue({
      session: { token: 'tok', userId: 'u1', merchantId: 'merchant-1' },
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('offers cancel to the owner only while the request is pending', async () => {
    mockGet.mockResolvedValue(request())
    await renderPage()

    expect(screen.getByRole('button', { name: /cancel request/i })).toBeEnabled()
  })

  it.each(['paid', 'expired', 'cancelled'] as const)(
    'does not offer cancel to the owner of a %s request',
    async (status) => {
      mockGet.mockResolvedValue(request({ status }))
      await renderPage()

      expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument()
      expect(mockCancel).not.toHaveBeenCalled()
    }
  )
})
