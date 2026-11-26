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
  hasNextPage: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}

/**
 * Shared shell for every `/admin/*` list page: loading spinner, error state
 * with retry, empty state, or the current server-paginated page as a table.
 */
export function AdminTable<T>({
  rows,
  columns,
  getRowKey,
  error,
  onRetry,
  emptyMessage,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
}: AdminTableProps<T>) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (!rows) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  const pagination = hasNextPage ? (
    <div className="border-hairline flex items-center justify-center border-t px-4 py-3 text-sm">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isLoadingMore}
        className="border-hairline flex items-center gap-2 rounded-md border px-3 py-1.5 disabled:opacity-40"
      >
        {isLoadingMore ? <LoadingSpinner /> : null}
        Show more
      </button>
    </div>
  ) : null

  if (rows.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
        <EmptyStateIllustration variant="empty" className="size-20" />
        <p className="text-dim text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-panel border-hairline overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
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
            {rows.map((row) => (
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
      </div>
      {pagination}
    </div>
  )
}
