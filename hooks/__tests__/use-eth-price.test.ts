import { renderHook, waitFor, act } from '@testing-library/react'
import { useEthPrice } from '../use-eth-price'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('/api/rates', () => {
    return HttpResponse.json({
      ethereum: { usd: 3500 },
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('useEthPrice hook', () => {
  it('should fetch ETH price successfully on mount', async () => {
    const { result } = renderHook(() => useEthPrice())

    // Initial state
    expect(result.current.loading).toBe(true)
    expect(result.current.price).toBeNull()

    // Wait for the fetch to resolve
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.price).toBe(3500)
    expect(result.current.error).toBeNull()
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
  })

  it('should handle API errors appropriately', async () => {
    server.use(
      http.get('/api/rates', () => {
        return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' })
      })
    )

    const { result } = renderHook(() => useEthPrice())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.price).toBeNull()
    expect(result.current.error).toContain('Failed to fetch ETH price')
  })

  it('should support manual refetching', async () => {
    let callCount = 0
    server.use(
      http.get('/api/rates', () => {
        callCount++
        return HttpResponse.json({
          ethereum: { usd: callCount === 1 ? 3000 : 3200 },
        })
      })
    )

    const { result } = renderHook(() => useEthPrice())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.price).toBe(3000)

    // Manual refetch
    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.price).toBe(3200)
    expect(result.current.error).toBeNull()
  })
})
