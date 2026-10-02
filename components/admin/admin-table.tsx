'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'

interface Column<T> {
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface AdminTableProps<T> {
  rows: T[] | null
  columns: Column<T>[]
  getRowKey: (row: T) => string
  error: string | null
  onRetry: () => void
  emptyMessage: string
  /** Text a row is matched against by the search box; omit to hide search. */
  searchText?: (row: T) => string
  searchPlaceholder?: string
}

const PAGE_SIZE = 25

/**
 * Shared shell for every `/admin/*` list page: loading spinner, error state
 * with retry, empty state, or the data as a table. Every admin list looks
 * the same shape-wise (rows fetched once, no pagination yet), so this is the
 * one place that shape is written.
 */
export function AdminTable<T>({
  rows,
  columns,
  getRowKey,
  error,
  onRetry,
  emptyMessage,
  searchText,
  searchPlaceholder = 'Search',
}: AdminTableProps<T>) {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!rows || !needle || !searchText) return rows ?? []
    return rows.filter((row) => searchText(row).toLowerCase().includes(needle))
  }, [rows, query, searchText])

  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (!rows) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
        <EmptyStateIllustration variant="empty" className="size-20" />
        <p className="text-dim text-sm">{emptyMessage}</p>
      </div>
    )
  }

  const shown = matches.slice(0, visible)

  return (
    <div className="space-y-3">
      {searchText && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setVisible(PAGE_SIZE)
            }}
            className="max-w-sm"
          />
          <p className="text-dim text-xs" aria-live="polite">
            {matches.length === rows.length
              ? `${rows.length.toLocaleString('en-NG')} rows`
              : `${matches.length.toLocaleString('en-NG')} of ${rows.length.toLocaleString('en-NG')} rows`}
          </p>
        </div>
      )}
      <div className="bg-panel border-hairline overflow-x-auto rounded-2xl border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-hairline text-dim border-b text-xs tracking-wide uppercase">
              {columns.map((col) => (
                <th key={col.header} className="px-4 py-3 font-semibold whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-raised/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.header} className={col.className ?? 'px-4 py-3 whitespace-nowrap'}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="text-dim px-4 py-8 text-center text-sm">No rows match “{query}”.</p>
        )}
      </div>
      {matches.length > shown.length && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setVisible((count) => count + PAGE_SIZE)}
        >
          Show more ({(matches.length - shown.length).toLocaleString('en-NG')} left)
        </Button>
      )}
    </div>
  )
}
