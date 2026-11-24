'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { Badge } from '@/components/ui/badge'
import { api, type AdminUserRow } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { formatDateTime } from '@/lib/format-date'

const PAGE_SIZE = 25

export default function AdminUsersPage() {
  const { token } = useAuthenticatedSession()
  const [rows, setRows] = useState<AdminUserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        setRows(await api.adminUsers(token, limit, signal))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load users')
      }
    },
    [token, limit]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const loadMore = useCallback(async () => {
    const nextLimit = limit + PAGE_SIZE
    setLoadingMore(true)
    try {
      setRows(await api.adminUsers(token, nextLimit))
      setLimit(nextLimit)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more users')
    } finally {
      setLoadingMore(false)
    }
  }, [token, limit])

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-dim mt-1 text-sm">Every account, most recently created first.</p>
      </header>

      <div className="mt-6">
        <AdminTable
          rows={rows}
          error={error}
          onRetry={() => void load()}
          getRowKey={(row) => row.id}
          searchText={(row) => `${row.name} ${row.email} ${row.merchant_name ?? ''}`}
          searchPlaceholder="Search name, email or merchant"
          emptyMessage="No users yet."
          limit={limit}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          columns={[
            { header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
            { header: 'Email', render: (row) => row.email },
            {
              header: 'Admin',
              render: (row) =>
                row.is_admin ? <Badge>Admin</Badge> : <span className="text-dim">—</span>,
            },
            {
              header: 'Merchant',
              render: (row) => row.merchant_name ?? <span className="text-dim">None</span>,
            },
            {
              header: 'Created',
              render: (row) => <span className="text-dim">{formatDateTime(row.created_at)}</span>,
            },
          ]}
        />
      </div>
    </div>
  )
}
