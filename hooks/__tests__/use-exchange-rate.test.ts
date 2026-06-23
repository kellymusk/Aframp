import { renderHook, waitFor, act } from '@testing-library/react'
import { useExchangeRate } from '../use-exchange-rate'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('/api/exchange-rate', () => {
    return HttpResponse.json({
      'usd-coin': { ghs: 12.0 },
      stellar: { ghs: 1.5 },
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())

describe('useExchangeRate hook', () => {
  it('should fetch exchange rate successfully on mount', async () => {
    const { result } = renderHook(() => useExchangeRate('GHS', 'USDC'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.data?.rate).toBeCloseTo(1 / 12.0)
    expect(result.current.displayRate).toContain('1 GHS =')
  })

  it('should fallback to cached rates on failure', async () => {
    // Populate cache
    localStorage.setItem(
      'onramp:rates',
      JSON.stringify({
        timestamp: Date.now(),
        data: {
          'usd-coin': { ghs: 10.0 },
          stellar: { ghs: 1.2 },
        },
      })
    )

    // Force error response
    server.use(
      http.get('/api/exchange-rate', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useExchangeRate('GHS', 'USDC'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 4000 })

    // Expect cached rate to be used
    expect(result.current.data?.rate).toBeCloseTo(1 / 10.0)
    expect(result.current.warning).toContain('Using cached exchange rate')
  })

  it('should handle complete errors when cache is empty', async () => {
    server.use(
      http.get('/api/exchange-rate', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useExchangeRate('GHS', 'USDC'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 4000 })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeDefined()
  })
})
