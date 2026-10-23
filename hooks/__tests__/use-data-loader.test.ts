import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { createElement, type ReactNode } from 'react'
import { useDataLoader } from '../use-data-loader'

// Every test gets its own cache so results never leak between them.
function wrapper({ children }: { children: ReactNode }) {
  return createElement(SWRConfig, { value: { provider: () => new Map() } }, children)
}

describe('useDataLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('starts with loading state', () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'test' })
    const { result } = renderHook(() => useDataLoader(['test'], fetcher), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('loads data successfully', async () => {
    const mockData = { id: 1, name: 'Test' }
    const fetcher = jest.fn().mockResolvedValue(mockData)
    const { result } = renderHook(() => useDataLoader(['test'], fetcher), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBe(null)
  })

  it('handles errors correctly', async () => {
    const errorMessage = 'Failed to fetch data'
    const fetcher = jest.fn().mockRejectedValue(new Error(errorMessage))
    const { result } = renderHook(() => useDataLoader(['test'], fetcher), { wrapper })

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe(null)
  })

  it('handles non-Error rejections', async () => {
    const fetcher = jest.fn().mockRejectedValue('string error')
    const { result } = renderHook(() => useDataLoader(['test'], fetcher), { wrapper })

    await waitFor(() => {
      expect(result.current.error).toBe('An error occurred')
    })

    expect(result.current.data).toBe(null)
  })

  it('does not fetch while the key is null', () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'test' })
    renderHook(() => useDataLoader(null, fetcher), { wrapper })

    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reloads data when the key changes', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'initial' })
    const { result, rerender } = renderHook(({ dep }) => useDataLoader(['test', dep], fetcher), {
      initialProps: { dep: 'value1' },
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    fetcher.mockResolvedValue({ data: 'updated' })
    rerender({ dep: 'value2' })

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'updated' })
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reload function triggers a new fetch', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' })

    const { result } = renderHook(() => useDataLoader(['test'], fetcher), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'first' })
    })

    result.current.reload()

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'second' })
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('renders cached data immediately on remount while revalidating', async () => {
    const cache = new Map()
    const shared = ({ children }: { children: ReactNode }) =>
      createElement(SWRConfig, { value: { provider: () => cache } }, children)
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' })

    const first = renderHook(() => useDataLoader(['test'], fetcher), { wrapper: shared })
    await waitFor(() => {
      expect(first.result.current.data).toEqual({ data: 'first' })
    })
    first.unmount()

    const second = renderHook(() => useDataLoader(['test'], fetcher), { wrapper: shared })
    // Cached result is there on the first render, with no loading state.
    expect(second.result.current.loading).toBe(false)
    expect(second.result.current.data).toEqual({ data: 'first' })

    await waitFor(() => {
      expect(second.result.current.data).toEqual({ data: 'second' })
    })
  })

  it('shares one in-flight request between components using the same key', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'shared' })
    const { result } = renderHook(
      () => [useDataLoader(['test'], fetcher), useDataLoader(['test'], fetcher)] as const,
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current[0].data).toEqual({ data: 'shared' })
      expect(result.current[1].data).toEqual({ data: 'shared' })
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
