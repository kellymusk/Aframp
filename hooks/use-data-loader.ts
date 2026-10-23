import useSWR from 'swr'

export interface UseDataLoaderResult<T> {
  data: T | null
  error: string | null
  /** True only while there is nothing to show yet; a revalidation behind cached data is not "loading". */
  loading: boolean
  reload: () => void
}

/**
 * Loads data with stale-while-revalidate caching and request deduplication.
 *
 * Results are cached by `key`, so revisiting a page renders the last result
 * immediately while it refetches in the background, and components asking for
 * the same key share a single in-flight request. Include anything the data
 * depends on (the session token, a page size, ...) in the key.
 *
 * Pass `null` to skip loading until a dependency is ready.
 *
 * @example
 * const { data, error, loading, reload } = useDataLoader(
 *   ['balances', token],
 *   () => api.getBalances(token)
 * )
 */
export function useDataLoader<T>(
  key: readonly unknown[] | null,
  fetcher: () => Promise<T>
): UseDataLoaderResult<T> {
  const { data, error, isLoading, mutate } = useSWR<T, unknown, readonly unknown[] | null>(
    key,
    fetcher,
    {
      // A failed load is surfaced once and retried by the user, as before.
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    }
  )

  return {
    data: data ?? null,
    // Keep showing cached data if a background refresh fails.
    error:
      data === undefined && error !== undefined
        ? error instanceof Error
          ? error.message
          : 'An error occurred'
        : null,
    loading: isLoading,
    reload: () => void mutate(),
  }
}
