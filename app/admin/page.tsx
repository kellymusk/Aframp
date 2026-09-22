'use client'

import { useCallback, useEffect, useState } from 'react'
import { StatCard } from '@/components/admin/stat-card'
import { StatusBreakdown } from '@/components/admin/status-breakdown'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { api, type AdminOverview } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'

export default function AdminOverviewPage() {
  const { token } = useAuthenticatedSession()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        setOverview(await api.adminOverview(token, signal))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load the overview')
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
  if (!overview) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-dim mt-1 text-sm">Platform-wide totals across every merchant.</p>
      </header>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <StatCard label="Total users" value={overview.total_users.toLocaleString()} />
        <StatCard label="Total merchants" value={overview.total_merchants.toLocaleString()} />
        <StatCard label="Total wallets" value={overview.total_wallets.toLocaleString()} />
      </div>

      <div className="mt-5">
        <div className="bg-panel border-hairline rounded-2xl border p-5">
          <p className="text-dim text-xs">Balances by asset</p>
          {overview.balances_by_asset.length === 0 ? (
            <p className="text-dim mt-3 text-sm">No balances yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {overview.balances_by_asset.map((row) => (
                <li key={row.asset} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{row.asset}</span>
                  <span className="text-sm tabular-nums">
                    {formatStroops(row.available)} available
                    {row.pending > 0n && (
                      <span className="text-dim"> · {formatStroops(row.pending)} pending</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <StatusBreakdown title="Payments" items={overview.payments_by_status} />
        <StatusBreakdown title="Withdrawals" items={overview.withdrawals_by_status} />
        <StatusBreakdown title="Payment requests" items={overview.payment_requests_by_status} />
      </div>
    </div>
  )
}
