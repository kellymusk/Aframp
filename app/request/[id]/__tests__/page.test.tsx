import { Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'
import { api } from '@/lib/api'
import PaymentRequestPage from '../page'

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
    api: { getPaymentRequest: jest.fn() },
    ApiError,
  }
})

jest.mock('react-qr-code', () => {
  const React = jest.requireActual('react')
  return {
    __esModule: true,
    default: ({ value }: { value: string }) =>
      React.createElement('svg', { 'data-testid': 'sep7-qr', 'data-value': value }),
  }
})

const mockGetPaymentRequest = api.getPaymentRequest as jest.Mock

function cngnRequest(sep7Uri: string | null) {
  return {
    id: 'req-1',
    merchant_id: 'm',
    address: 'GABCDEF',
    network: 'stellar',
    amount_stroops: 500_000_000n,
    asset: 'cNGN',
    memo: 'REF-1',
    status: 'pending',
    allow_partial: false,
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    created_at: '',
    sep7_uri: sep7Uri,
  }
}

describe('PaymentRequestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders a scannable code from the backend SEP-7 URI for cNGN', async () => {
    const params = Promise.resolve({ id: 'req-1' })
    const sep7Uri = 'stellar:GABCDEF?amount=50&asset=cNGN_CNYZZ&memo=REF-1'
    mockGetPaymentRequest.mockResolvedValue(cngnRequest(sep7Uri))

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <PaymentRequestPage params={params} />
        </Suspense>
      )
      await Promise.resolve()
    })

    const qr = await screen.findByTestId('sep7-qr')
    expect(qr).toHaveAttribute('data-value', sep7Uri)
    expect(screen.getByText('50 cNGN')).toBeInTheDocument()
  })

  it('falls back to address and memo when the backend has no SEP-7 URI', async () => {
    const params = Promise.resolve({ id: 'req-1' })
    mockGetPaymentRequest.mockResolvedValue(cngnRequest(null))

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <PaymentRequestPage params={params} />
        </Suspense>
      )
      await Promise.resolve()
    })

    expect(await screen.findByText(/No scannable code for cNGN yet/)).toBeInTheDocument()
    expect(screen.queryByTestId('sep7-qr')).not.toBeInTheDocument()
    expect(screen.getByText('GABCDEF')).toBeInTheDocument()
    expect(screen.getByText('REF-1')).toBeInTheDocument()
  })
})
