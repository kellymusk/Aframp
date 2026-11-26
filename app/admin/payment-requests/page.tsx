'use client'

import { useCallback } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { Badge } from '@/components/ui/badge'
import { api, type PaymentRequestStatus } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useAdminPagination } from '@/hooks/use-admin-pagination'

function statusVariant(status: PaymentRequestStatus) {
  if (status === 'paid') return 'default' as const
  if (status === 'expired') return 'destructive' as const
  return 'secondary' as const
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminPaymentRequestsPage() {
  const { token } = useAuthenticatedSession()
  const { rows, error, page, pageSize, hasNextPage, setPage, retry } = useAdminPagination(
    useCallback(
      (requestedPage, requestedPageSize, signal) =>
        api.adminPaymentRequests(token, requestedPage, requestedPageSize, signal),
      [token]
    )
  )

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Payment requests</h1>
        <p className="text-dim mt-1 text-sm">Charges created across every merchant.</p>
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
          emptyMessage="No payment requests yet."
          columns={[
            {
              header: 'Merchant',
              render: (row) => <span className="font-medium">{row.merchant_name}</span>,
            },
            {
              header: 'Amount',
              render: (row) => (
                <span className="tabular-nums">
                  {formatStroops(row.amount_stroops)} {row.asset}
                </span>
              ),
            },
            {
              header: 'Memo',
              render: (row) => <span className="text-dim">{row.memo || '—'}</span>,
            },
            {
              header: 'Status',
              render: (row) => (
                <Badge variant={statusVariant(row.status)} className="capitalize">
                  {row.status}
                </Badge>
              ),
            },
            {
              header: 'Expires',
              render: (row) => <span className="text-dim">{formatWhen(row.expires_at)}</span>,
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
