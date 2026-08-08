/**
 * E2E-style flow test: Bills → Receipt
 *
 * Covers:
 *  1. BillsReceiptClient renders a receipt when the API returns a completed transaction
 *  2. BillsReceiptClient shows "Receipt unavailable" when the API fails and no cache exists
 *  3. BillsReceiptClient shows a loading state initially
 *  4. BillsReceiptClient shows the offline-cache warning when data comes from cache
 */

import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Next.js navigation mocks
// ---------------------------------------------------------------------------
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn().mockReturnValue(null) }),
}))

// ---------------------------------------------------------------------------
// Heavy / browser-only module mocks
// ---------------------------------------------------------------------------
jest.mock('@/lib/offramp/pdf-generator', () => ({ generateReceiptPDF: jest.fn() }))
jest.mock('@/lib/bills/export', () => ({
  exportReceiptPNG: jest.fn(),
  exportReceiptCSV: jest.fn(),
}))
jest.mock('@/lib/receipt-cache', () => ({
  saveReceipt: jest.fn().mockResolvedValue(undefined),
  loadReceipt: jest.fn().mockResolvedValue(null),
}))
jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: () => <svg data-testid="qr-code" />,
}))

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------
import { BillsReceiptClient } from '../bills-receipt-client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TRANSACTION_ID = 'txn-bills-001'

const completedTransaction = {
  id: TRANSACTION_ID,
  amount: 5000,
  currency: 'NGN',
  fee: 50,
  biller: 'EKEDC',
  billerCategory: 'Electricity',
  accountLabel: '12345678901',
  status: 'completed',
  reference: 'REF-2024-001',
  createdAt: new Date().toISOString(),
  paymentMethod: 'Bank Transfer',
  timeline: [],
  customerSupportEmail: 'support@aframp.com',
  txHash: 'stellar-tx-hash-abc',
}

function mockFetchSuccess(data = completedTransaction) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response)
}

function mockFetchFailure() {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Bills → Receipt flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset loadReceipt to return null by default (no cache)
    const { loadReceipt } = require('@/lib/receipt-cache')
    loadReceipt.mockResolvedValue(null)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows loading state initially', () => {
    // Fetch never resolves during this test
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}))

    render(<BillsReceiptClient transactionId={TRANSACTION_ID} />)

    expect(screen.getByText(/loading receipt/i)).toBeInTheDocument()
  })

  it('renders the receipt when the API returns a completed transaction', async () => {
    mockFetchSuccess()

    render(<BillsReceiptClient transactionId={TRANSACTION_ID} />)

    await waitFor(() => {
      expect(screen.getByText('Payment receipt')).toBeInTheDocument()
    })

    expect(screen.getByText('EKEDC')).toBeInTheDocument()
    expect(screen.getByText('Electricity')).toBeInTheDocument()
    expect(screen.getByText('REF-2024-001')).toBeInTheDocument()
    expect(screen.getByText(/12345678901/)).toBeInTheDocument()
  })

  it('shows the transaction ID in the receipt header', async () => {
    mockFetchSuccess()

    render(<BillsReceiptClient transactionId={TRANSACTION_ID} />)

    await waitFor(() => {
      expect(screen.getByText(`Transaction ID: ${TRANSACTION_ID}`)).toBeInTheDocument()
    })
  })

  it('shows "Receipt unavailable" when the API fails and no cache exists', async () => {
    mockFetchFailure()

    render(<BillsReceiptClient transactionId={TRANSACTION_ID} />)

    await waitFor(() => {
      expect(screen.getByText('Receipt unavailable')).toBeInTheDocument()
    })
  })

  it('shows the offline-cache warning when data comes from cache', async () => {
    const { loadReceipt } = require('@/lib/receipt-cache')
    loadReceipt.mockResolvedValue(completedTransaction)
    mockFetchFailure()

    render(<BillsReceiptClient transactionId={TRANSACTION_ID} />)

    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument()
    })
  })

  it('shows the "Back to Bills" link when receipt is unavailable', async () => {
    mockFetchFailure()

    render(<BillsReceiptClient transactionId={TRANSACTION_ID} />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back to bills/i })).toBeInTheDocument()
    })
  })
})
