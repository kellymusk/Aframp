'use client'

import { useCallback } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { Badge } from '@/components/ui/badge'
import { api, type PaymentStatus } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useAdminPagination } from '@/hooks/use-admin-pagination'

/** Testnet today; swap for `public` when the backend points at mainnet Horizon. */
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx'

const STATUS_LABEL: Record<PaymentStatus, string> = {
  detected: 'Detected',
  verified: 'Verifying',
  confirmed: 'Confirmed',
  failed: 'Failed',
}

function statusVariant(status: PaymentStatus) {
  if (status === 'confirmed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}

function shorten(value: string) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminTransactionsPage() {
  const { token } = useAuthenticatedSession()
  const { rows, error, page, pageSize, hasNextPage, setPage, retry } = useAdminPagination(
    useCallback(
      (requestedPage, requestedPageSize, signal) =>
        api.adminTransactions(token, requestedPage, requestedPageSize, signal),
      [token]
    )
  )

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-dim mt-1 text-sm">Detected deposits across every merchant.</p>
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
          emptyMessage="No transactions yet."
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
              header: 'Tx hash',
              render: (row) => (
                <a
                  href={`${EXPLORER_BASE}/${row.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-mono text-xs hover:underline"
                >
                  {shorten(row.tx_hash)}
                </a>
              ),
            },
            {
              header: 'Status',
              render: (row) => (
                <Badge variant={statusVariant(row.status)}>{STATUS_LABEL[row.status]}</Badge>
              ),
            },
            { header: 'Confirmations', render: (row) => row.confirmations },
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
