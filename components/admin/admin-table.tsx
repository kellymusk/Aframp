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
  page: number
  pageSize: number
  hasNextPage: boolean
  onPageChange: (page: number) => void
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
  page,
  pageSize,
  hasNextPage,
  onPageChange,
}: AdminTableProps<T>) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (!rows) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  const pagination =
    rows.length > 0 || page > 1 ? (
      <div className="border-hairline flex items-center justify-between border-t px-4 py-3 text-sm">
        <span className="text-dim">Page {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="border-hairline rounded-md border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage || rows.length < pageSize}
            className="border-hairline rounded-md border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    ) : null

  if (rows.length === 0 && page === 1) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
        <EmptyStateIllustration variant="empty" className="size-20" />
        <p className="text-dim text-sm">{emptyMessage}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-panel border-hairline overflow-hidden rounded-2xl border">
        <p className="text-dim px-4 py-8 text-center text-sm">No more records.</p>
        {pagination}
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
