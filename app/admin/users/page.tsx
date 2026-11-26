'use client'

import { useCallback } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useAdminPagination } from '@/hooks/use-admin-pagination'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminUsersPage() {
  const { token } = useAuthenticatedSession()
  const { rows, error, page, pageSize, hasNextPage, setPage, retry } = useAdminPagination(
    useCallback(
      (requestedPage, requestedPageSize, signal) =>
        api.adminUsers(token, requestedPage, requestedPageSize, signal),
      [token]
    )
  )

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
          onRetry={retry}
          page={page}
          pageSize={pageSize}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
          getRowKey={(row) => row.id}
          emptyMessage="No users yet."
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
              render: (row) => <span className="text-dim">{formatWhen(row.created_at)}</span>,
            },
          ]}
        />
      </div>
    </div>
  )
}
