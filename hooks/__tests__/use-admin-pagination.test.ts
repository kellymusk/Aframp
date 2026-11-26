import { act, renderHook, waitFor } from '@testing-library/react'
import { ADMIN_PAGE_SIZE, useAdminPagination } from '@/hooks/use-admin-pagination'

describe('useAdminPagination', () => {
  it('loads 25 records at a time and advances to the requested page', async () => {
    const loadPage = jest.fn((page: number) =>
      Promise.resolve(page === 1 ? Array.from({ length: ADMIN_PAGE_SIZE }, (_, i) => i) : [])
    )
    const { result } = renderHook(() => useAdminPagination(loadPage))

    await waitFor(() => expect(result.current.rows).toHaveLength(ADMIN_PAGE_SIZE))
    expect(loadPage).toHaveBeenLastCalledWith(1, 25, expect.any(AbortSignal))
    expect(result.current.hasNextPage).toBe(true)

    act(() => result.current.setPage(2))

    await waitFor(() => expect(loadPage).toHaveBeenLastCalledWith(2, 25, expect.any(AbortSignal)))
    await waitFor(() => expect(result.current.rows).toEqual([]))
    expect(result.current.page).toBe(2)
    expect(result.current.hasNextPage).toBe(false)
  })

  it('does not allow navigation before the first page', async () => {
    const loadPage = jest.fn(() => Promise.resolve([]))
    const { result } = renderHook(() => useAdminPagination(loadPage))

    await waitFor(() => expect(result.current.rows).toEqual([]))
    act(() => result.current.setPage(0))

    expect(result.current.page).toBe(1)
  })
})
