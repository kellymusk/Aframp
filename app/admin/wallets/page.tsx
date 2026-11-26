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

export default function AdminWalletsPage() {
  const { token } = useAuthenticatedSession()
  const { rows, error, hasMore, isLoadingMore, loadMore, retry } = useAdminPagination(
    useCallback(
      (cursor, signal) => api.adminWallets(token, cursor, signal),
      [token]
    )
  )

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
        <p className="text-dim mt-1 text-sm">Every merchant wallet, across every network.</p>
      </header>

      <div className="mt-6">
        <AdminTable
          rows={rows}
          error={error}
          onRetry={retry}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          getRowKey={(row) => row.id}
          emptyMessage="No wallets yet."
          columns={[
            {
              header: 'Merchant',
              render: (row) => <span className="font-medium">{row.merchant_name}</span>,
            },
            {
              header: 'Address',
              render: (row) => (
                <span className="font-mono text-xs">{shortenAddress(row.address)}</span>
              ),
            },
            { header: 'Network', render: (row) => row.network },
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
