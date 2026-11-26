'use client'

import { useCallback } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { api } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useAdminPagination } from '@/hooks/use-admin-pagination'

function shortenAddress(address: string) {
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminMerchantsPage() {
  const { token } = useAuthenticatedSession()
  const { rows, error, page, pageSize, hasNextPage, setPage, retry } = useAdminPagination(
    useCallback(
      (requestedPage, requestedPageSize, signal) =>
        api.adminMerchants(token, requestedPage, requestedPageSize, signal),
      [token]
    )
  )

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Merchants</h1>
        <p className="text-dim mt-1 text-sm">Every merchant account on the platform.</p>
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
          emptyMessage="No merchants yet."
          columns={[
            { header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
            { header: 'Owner', render: (row) => row.owner_email },
            {
              header: 'Wallet address',
              render: (row) =>
                row.wallet_address ? (
                  <span className="font-mono text-xs">{shortenAddress(row.wallet_address)}</span>
                ) : (
                  <span className="text-dim">No wallet</span>
                ),
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
