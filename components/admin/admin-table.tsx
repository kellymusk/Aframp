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
}

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
}: AdminTableProps<T>) {
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

  return (
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
  )
}
