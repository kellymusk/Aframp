import { act, renderHook, waitFor } from '@testing-library/react'
import { ADMIN_PAGE_SIZE, useAdminPagination } from '@/hooks/use-admin-pagination'

describe('useAdminPagination', () => {
  it('loads the first page without a cursor', async () => {
    const loadPage = jest.fn(() =>
      Promise.resolve({
        rows: Array.from({ length: ADMIN_PAGE_SIZE }, (_, i) => i),
        nextCursor: 'cursor-2',
      })
    )
    const { result } = renderHook(() => useAdminPagination(loadPage))

    await waitFor(() => expect(result.current.rows).toHaveLength(ADMIN_PAGE_SIZE))
    expect(loadPage).toHaveBeenLastCalledWith(undefined, 25, expect.any(AbortSignal))
    expect(result.current.hasNextPage).toBe(true)
    expect(result.current.nextCursor).toBe('cursor-2')
  })

  it('appends rows from successive pages when loadMore is called', async () => {
    const loadPage = jest.fn((cursor?: string) =>
      Promise.resolve(
        cursor === undefined
          ? { rows: [1, 2, 3], nextCursor: 'cursor-2' }
          : { rows: [4, 5, 6], nextCursor: 'cursor-3' }
      )
    )
    const { result } = renderHook(() => useAdminPagination(loadPage))

    await waitFor(() => expect(result.current.rows).toEqual([1, 2, 3]))
    expect(loadPage).toHaveBeenLastCalledWith(undefined, 25, expect.any(AbortSignal))

    act(() => result.current.loadMore())

    await waitFor(() => expect(loadPage).toHaveBeenLastCalledWith('cursor-2', 25, expect.any(AbortSignal)))
    await waitFor(() => expect(result.current.rows).toEqual([1, 2, 3, 4, 5, 6]))
    expect(result.current.nextCursor).toBe('cursor-3')
    expect(result.current.hasNextPage).toBe(true)
  })

  it('stops loading when no next cursor is returned', async () => {
    const loadPage = jest.fn((cursor?: string) =>
      Promise.resolve(
        cursor === undefined
          ? { rows: [1, 2, 3], nextCursor: 'cursor-2' }
          : { rows: [4, 5, 6], nextCursor: null }
      )
    )
    const { result } = renderHook(() => useAdminPagination(loadPage))

    await waitFor(() => expect(result.current.rows).toEqual([1, 2, 3]))
    expect(result.current.hasNextPage).toBe(true)

    act(() => result.current.loadMore())

    await waitFor(() => expect(result.current.rows).toEqual([1, 2, 3, 4, 5, 6]))
    expect(result.current.nextCursor).toBeNull()
    expect(result.current.hasNextPage).toBe(false)

    act(() => result.current.loadMore())

    expect(loadPage).toHaveBeenCalledTimes(2)
    expect(result.current.rows).toEqual([1, 2, 3, 4, 5, 6])
  })
})