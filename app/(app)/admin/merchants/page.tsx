'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { api, type AdminMerchantRow } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { formatDateTime } from '@/lib/format-date'

const PAGE_SIZE = 25

function shortenAddress(address: string) {
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function AdminMerchantsPage() {
  const { token } = useAuthenticatedSession()
  const [rows, setRows] = useState<AdminMerchantRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        setRows(await api.adminMerchants(token, limit, signal))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load merchants')
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
      setRows(await api.adminMerchants(token, nextLimit))
      setLimit(nextLimit)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more merchants')
    } finally {
      setLoadingMore(false)
    }
  }, [token, limit])

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
          onRetry={() => void load()}
          getRowKey={(row) => row.id}
          searchText={(row) => `${row.name} ${row.owner_email} ${row.wallet_address ?? ''}`}
          searchPlaceholder="Search name, owner email or wallet"
          emptyMessage="No merchants yet."
          limit={limit}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
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
              render: (row) => <span className="text-dim">{formatDateTime(row.created_at)}</span>,
            },
          ]}
        />
      </div>
    </div>
  )
}
