import { Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'
import PaymentRequestPage from '../page'
import { api, type PaymentRequest } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  api: { getPaymentRequest: jest.fn() },
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

jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}))

const mockGetPaymentRequest = api.getPaymentRequest as jest.Mock

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

describe('PaymentRequestPage merchant name rendering', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockGetPaymentRequest.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows a name with markup as plain text, never as HTML', async () => {
    mockGetPaymentRequest.mockResolvedValue(
      pendingRequest({ merchant_name: '<img src=x onerror=alert(1)> Stores' })
    )
    await renderPage()

    expect(screen.getByText('Paying <img src=x onerror=alert(1)> Stores')).toBeInTheDocument()
    expect(document.querySelector('img[src="x"]')).toBeNull()
  })

  it('omits the merchant line when the field is missing altogether', async () => {
    mockGetPaymentRequest.mockResolvedValue(pendingRequest())
    await renderPage()

    expect(screen.queryByText(/^Paying /)).not.toBeInTheDocument()
  })
})
