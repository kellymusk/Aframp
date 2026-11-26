'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const ADMIN_PAGE_SIZE = 25

export type AdminPage<T> = {
  rows: T[]
  nextCursor: string | null
}

type PageLoader<T> = (
  cursor: string | null,
  pageSize: number,
  signal?: AbortSignal,
) => Promise<AdminPage<T>>

export function useAdminPagination<T>(loadPage: PageLoader<T>) {
  const [rows, setRows] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadMoreController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setRows(null)
    setError(null)
    setNextCursor(null)
    setIsLoadingMore(false)

    loadPage(null, ADMIN_PAGE_SIZE, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        setRows(page.rows)
        setNextCursor(page.nextCursor)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Could not load records')
      })

    return () => {
      controller.abort()
      loadMoreController.current?.abort()
      loadMoreController.current = null
    }
  }, [loadPage, refreshKey])

  const loadMore = useCallback(() => {
    if (nextCursor === null || isLoadingMore) return

    const controller = new AbortController()
    loadMoreController.current?.abort()
    loadMoreController.current = controller
    setIsLoadingMore(true)
    setError(null)

    loadPage(nextCursor, ADMIN_PAGE_SIZE, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        setRows((current) => [...(current ?? []), ...page.rows])
        setNextCursor(page.nextCursor)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Could not load records')
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setIsLoadingMore(false)
        if (loadMoreController.current === controller) loadMoreController.current = null
      })
  }, [loadPage, nextCursor, isLoadingMore])

  return {
    rows,
    error,
    pageSize: ADMIN_PAGE_SIZE,
    nextCursor,
    hasNextCursor: nextCursor !== null,
    isLoadingMore,
    loadMore,
    retry: () => setRefreshKey((current) => current + 1),
  }
}