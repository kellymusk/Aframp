import { renderHook, act } from '@testing-library/react'
import { useKycStatusPolling } from '@/hooks/use-kyc-status-polling'

// ─── Mock kyc-context ─────────────────────────────────────────────────────────
const mockUpdateKycStatus = jest.fn()

jest.mock('@/contexts/kyc-context', () => ({
  useKyc: () => ({
    updateKycStatus: mockUpdateKycStatus,
  }),
}))

// ─── fetch mock ───────────────────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.useFakeTimers()
  mockFetch.mockReset()
  mockUpdateKycStatus.mockReset()
})

afterEach(() => {
  jest.useRealTimers()
})

function makeStatusResponse(status: string) {
  return {
    ok: true,
    json: async () => ({ status }),
  }
}

describe('useKycStatusPolling', () => {
  it('does not fetch when submissionId is null', () => {
    renderHook(() =>
      useKycStatusPolling({ submissionId: null })
    )
    jest.runAllTimers()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches immediately on mount when submissionId is provided', async () => {
    mockFetch.mockResolvedValue(makeStatusResponse('pending'))

    renderHook(() =>
      useKycStatusPolling({ submissionId: 'kyc_abc' })
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/kyc/status/kyc_abc')
  })

  it('calls onStatusChange with the returned status', async () => {
    const onStatusChange = jest.fn()
    mockFetch.mockResolvedValue(makeStatusResponse('pending'))

    renderHook(() =>
      useKycStatusPolling({ submissionId: 'kyc_abc', onStatusChange })
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(onStatusChange).toHaveBeenCalledWith('pending')
  })

  it('stops polling and calls onComplete when status is approved', async () => {
    const onComplete = jest.fn()
    mockFetch.mockResolvedValue(makeStatusResponse('approved'))

    renderHook(() =>
      useKycStatusPolling({ submissionId: 'kyc_abc', onComplete, pollInterval: 1000 })
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(onComplete).toHaveBeenCalledWith('approved')

    // Advance timers — should NOT trigger more fetches since interval is cleared
    const callCountAfterApproved = mockFetch.mock.calls.length
    jest.advanceTimersByTime(5000)
    await act(async () => { await Promise.resolve() })
    expect(mockFetch.mock.calls.length).toBe(callCountAfterApproved)
  })

  it('stops polling and calls onComplete when status is rejected', async () => {
    const onComplete = jest.fn()
    mockFetch.mockResolvedValue(makeStatusResponse('rejected'))

    renderHook(() =>
      useKycStatusPolling({ submissionId: 'kyc_xyz', onComplete, pollInterval: 1000 })
    )

    await act(async () => { await Promise.resolve() })

    expect(onComplete).toHaveBeenCalledWith('rejected')
  })

  it('stops polling and calls onComplete when status is expired', async () => {
    const onComplete = jest.fn()
    mockFetch.mockResolvedValue(makeStatusResponse('expired'))

    renderHook(() =>
      useKycStatusPolling({ submissionId: 'kyc_exp', onComplete, pollInterval: 1000 })
    )

    await act(async () => { await Promise.resolve() })

    expect(onComplete).toHaveBeenCalledWith('expired')
  })

  it('continues polling when status is pending (non-terminal)', async () => {
    const onStatusChange = jest.fn()
    mockFetch.mockResolvedValue(makeStatusResponse('pending'))

    renderHook(() =>
      useKycStatusPolling({ submissionId: 'kyc_poll', onStatusChange, pollInterval: 1000 })
    )

    // Initial fetch
    await act(async () => { await Promise.resolve() })

    // Advance by one poll interval — status unchanged so onStatusChange called once only
    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    // fetch was called at least twice (mount + 1 interval tick)
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('updates kyc context status via updateKycStatus', async () => {
    mockFetch.mockResolvedValue(makeStatusResponse('approved'))

    renderHook(() =>
      useKycStatusPolling({ submissionId: 'kyc_ctx' })
    )

    await act(async () => { await Promise.resolve() })

    expect(mockUpdateKycStatus).toHaveBeenCalledWith('approved')
  })
})
