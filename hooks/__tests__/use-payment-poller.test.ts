import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePaymentPoller } from '../use-payment-poller'
import { api } from '@/lib/api'
import { toast } from 'sonner'

vi.mock('@/lib/api', () => ({
  api: {
    listTransactions: vi.fn(),
  },
}))

vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    session: { token: 'mock-token', user_id: '123' },
    ready: true,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

describe('usePaymentPoller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('seeds initial fetched payments without triggering duplicate toasts', async () => {
    const mockPayments = [
      {
        id: 'tx-1',
        status: 'confirmed',
        amount_stroops: 10000000n,
        asset: 'cNGN',
      },
    ]

    vi.mocked(api.listTransactions).mockResolvedValueOnce(mockPayments as any)

    renderHook(() => usePaymentPoller(30000))

    await waitFor(() => {
      expect(api.listTransactions).toHaveBeenCalledWith('mock-token', 20)
    })

    // Initial fetch should seed, not toast
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('triggers a toast when a new confirmed payment appears on subsequent polls', async () => {
    const initialPayments = [
      {
        id: 'tx-1',
        status: 'confirmed',
        amount_stroops: 10000000n,
        asset: 'cNGN',
      },
    ]

    const laterPayments = [
      {
        id: 'tx-2',
        status: 'confirmed',
        amount_stroops: 25000000n,
        asset: 'XLM',
      },
      ...initialPayments,
    ]

    vi.mocked(api.listTransactions)
      .mockResolvedValueOnce(initialPayments as any)
      .mockResolvedValueOnce(laterPayments as any)

    renderHook(() => usePaymentPoller(30000))

    // Wait for initial render/poll
    await waitFor(() => {
      expect(api.listTransactions).toHaveBeenCalledTimes(1)
    })

    // Advance timers by 30 seconds for the next poll
    vi.advanceTimersByTime(30000)

    await waitFor(() => {
      expect(api.listTransactions).toHaveBeenCalledTimes(2)
    })

    expect(toast.success).toHaveBeenCalledWith(
      'New payment confirmed!',
      expect.objectContaining({
        description: expect.stringContaining('XLM'),
      })
    )
  })
})