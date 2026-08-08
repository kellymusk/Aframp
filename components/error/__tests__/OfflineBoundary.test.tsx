import { act, render, screen, waitFor } from '@testing-library/react'
import OfflineBoundary from '@/components/error/OfflineBoundary'
import { recordDataUpdate } from '@/lib/offline/connectivity'
import { getQueuedOrderSyncCount, queueOrderSync } from '@/lib/offline/order-sync-queue'

jest.mock('scheduler', () => require('scheduler/unstable_mock'))

const mockFetch = jest.fn()

function setOnline(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}

beforeEach(() => {
  window.localStorage.clear()
  setOnline(true)
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
})

afterEach(() => {
  setOnline(true)
})

describe('OfflineBoundary', () => {
  it('renders children normally while online', () => {
    render(
      <OfflineBoundary>
        <main>Account data</main>
      </OfflineBoundary>
    )

    expect(screen.getByText('Account data')).toBeInTheDocument()
    expect(screen.queryByText('You are offline')).not.toBeInTheDocument()
  })

  it('keeps content visible and shows the last data timestamp while offline', async () => {
    const timestamp = new Date('2026-07-29T12:00:00.000Z').getTime()
    recordDataUpdate(timestamp)
    setOnline(false)

    render(
      <OfflineBoundary>
        <main>Cached account data</main>
      </OfflineBoundary>
    )

    expect(await screen.findByText('You are offline')).toBeInTheDocument()
    expect(screen.getByText('Cached account data')).toBeInTheDocument()
    expect(
      screen.getByText(`Last data update: ${new Date(timestamp).toLocaleString()}`)
    ).toBeInTheDocument()
  })

  it('shows queued actions and replays them after reconnecting', async () => {
    setOnline(false)
    queueOrderSync('onramp', { id: 'order-1', status: 'created' }, 'GAWALLETONE')
    mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response)

    render(
      <OfflineBoundary>
        <main>Cached account data</main>
      </OfflineBoundary>
    )

    expect(await screen.findByText('1 action queued')).toBeInTheDocument()

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => {
      expect(screen.queryByText('You are offline')).not.toBeInTheDocument()
      expect(getQueuedOrderSyncCount()).toBe(0)
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('replays a queue from an earlier session when mounted online', async () => {
    queueOrderSync('onramp', { id: 'order-1', status: 'created' }, 'GAWALLETONE')
    mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response)

    render(
      <OfflineBoundary>
        <main>Account data</main>
      </OfflineBoundary>
    )

    await waitFor(() => {
      expect(getQueuedOrderSyncCount()).toBe(0)
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
