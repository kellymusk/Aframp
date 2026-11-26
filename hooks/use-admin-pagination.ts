'use client'

import { useEffect, useState } from 'react'

export const ADMIN_PAGE_SIZE = 25

type PageLoader<T> = (page: number, pageSize: number, signal?: AbortSignal) => Promise<T[]>

export function useAdminPagination<T>(loadPage: PageLoader<T>) {
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setRows(null)
    setError(null)

    loadPage(page, ADMIN_PAGE_SIZE, controller.signal)
      .then((nextRows) => {
        if (!controller.signal.aborted) setRows(nextRows)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Could not load records')
      })

    return () => controller.abort()
  }, [loadPage, page, refreshKey])

  return {
    rows,
    error,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    hasNextPage: rows !== null && rows.length === ADMIN_PAGE_SIZE,
    setPage: (nextPage: number) => setPage(Math.max(1, nextPage)),
    retry: () => setRefreshKey((current) => current + 1),
  }
}
