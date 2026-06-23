/**
 * E2E-style flow test: Onramp → Success
 *
 * Covers:
 *  1. OnrampSuccessClient renders a receipt when a completed order is in localStorage
 *  2. OnrampSuccessClient redirects to /onramp when no order is found
 *  3. OnrampSuccessClient redirects to /onramp/payment when order is not completed
 */

import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Next.js navigation mocks
// ---------------------------------------------------------------------------
const mockPush = jest.fn()
const mockGet = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
  useSearchParams: () => ({ get: mockGet }),
}))

// ---------------------------------------------------------------------------
// Heavy / browser-only module mocks
// ---------------------------------------------------------------------------
jest.mock('@/lib/onramp/receipt', () => ({ generateReceiptPDF: jest.fn() }))

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------
import { OnrampSuccessClient } from '../onramp-success-client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ORDER_ID = 'test-order-123'

const completedOrder = {
  id: ORDER_ID,
  status: 'completed',
  amount: 50000,
  fiatCurrency: 'NGN',
  cryptoAmount: 60,
  cryptoAsset: 'cNGN',
  walletAddress: 'GABC1234567890',
  paymentMethod: 'bank_transfer',
  txHash: 'abc123txhash',
  createdAt: new Date().toISOString(),
}

function seedOrder(order: typeof completedOrder) {
  localStorage.setItem(`onramp:order:${order.id}`, JSON.stringify(order))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Onramp → Success flow', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockClear()
    mockGet.mockClear()
  })

  it('renders the success receipt when a completed order exists', async () => {
    seedOrder(completedOrder)
    mockGet.mockReturnValue(ORDER_ID)

    render(<OnrampSuccessClient />)

    // The component shows a loading spinner first, then the receipt
    await waitFor(() => {
      // Receipt should show the crypto asset (may appear multiple times on the page)
      expect(screen.getAllByText(/cNGN/i).length).toBeGreaterThan(0)
    })
  })

  it('redirects to /onramp when no orderId is in search params', async () => {
    mockGet.mockReturnValue(null)

    render(<OnrampSuccessClient />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onramp')
    })
  })

  it('redirects to /onramp when order is not found in localStorage', async () => {
    mockGet.mockReturnValue('nonexistent-order')

    render(<OnrampSuccessClient />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onramp')
    })
  })

  it('redirects to /onramp/payment when order status is not completed', async () => {
    const pendingOrder = { ...completedOrder, status: 'pending' }
    seedOrder(pendingOrder as typeof completedOrder)
    mockGet.mockReturnValue(ORDER_ID)

    render(<OnrampSuccessClient />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/onramp/payment?order=${ORDER_ID}`)
    })
  })

  it('shows the formatted fiat amount on the receipt', async () => {
    seedOrder(completedOrder)
    mockGet.mockReturnValue(ORDER_ID)

    render(<OnrampSuccessClient />)

    await waitFor(() => {
      // formatCurrency(50000, 'NGN') → contains "50,000" or "₦50,000"
      expect(screen.getByText(/50[,.]?000/)).toBeInTheDocument()
    })
  })
})
