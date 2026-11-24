'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { api, type AdminWalletRow } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { formatDateTime } from '@/lib/format-date'

const PAGE_SIZE = 25

function shortenAddress(address: string) {
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function AdminWalletsPage() {
  const { token } = useAuthenticatedSession()
  const [rows, setRows] = useState<AdminWalletRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        setRows(await api.adminWallets(token, limit, signal))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load wallets')
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
      setRows(await api.adminWallets(token, nextLimit))
      setLimit(nextLimit)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more wallets')
    } finally {
      setLoadingMore(false)
    }
  }, [token, limit])

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
          onRetry={() => void load()}
          getRowKey={(row) => row.id}
          searchText={(row) => `${row.merchant_name} ${row.address}`}
          searchPlaceholder="Search merchant or address"
          emptyMessage="No wallets yet."
          limit={limit}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
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
              render: (row) => <span className="text-dim">{formatDateTime(row.created_at)}</span>,
            },
          ]}
        />
      </div>
    </div>
  )
}
