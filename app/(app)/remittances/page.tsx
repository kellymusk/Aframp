'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuthenticatedSession } from '@/components/session-provider'
import { api, type Remittance } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { getTransactionExplorerUrl } from '@/lib/config/network'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusVariant(status: Remittance['status']) {
  if (status === 'confirmed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}

export default function RemittancesPage() {
  const { token } = useAuthenticatedSession()
  const [rows, setRows] = useState<Remittance[] | null>(null)
  const [limit, setLimit] = useState(50)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal, l: number = limit) => {
      setError(null)
      try {
        setRows(await api.listRemittances(token, l, signal))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load remittances')
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (error) return <ErrorState message={error} onRetry={() => void load()} />
  if (!rows) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Remittances</h1>
        <p className="text-dim mt-1 text-sm">
          Track the status of your outbound Stellar transfers.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-dim mt-8 text-center text-sm">No outbound transfers yet.</p>
      ) : (
        <div className="bg-panel border-hairline mt-6 overflow-x-auto rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-hairline text-dim border-b text-xs uppercase">
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Transaction</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-raised/50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(row.status)} className="capitalize">
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {formatStroops(row.amount_stroops)} {row.asset}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="block max-w-64 break-all font-mono text-xs"
                      title={row.destination_address}
                    >
                      {row.destination_address}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.tx_hash ? (
                      <a
                        href={getTransactionExplorerUrl(row.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand font-mono text-xs hover:underline"
                      >
                        {row.tx_hash}
                      </a>
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                  <td className="text-dim px-4 py-3 whitespace-nowrap">
                    {formatWhen(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && rows.length >= limit && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setLimit((l) => l + 50)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
