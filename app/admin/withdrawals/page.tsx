'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { Badge } from '@/components/ui/badge'
import { api, type AdminWithdrawalRow, type WithdrawalStatus } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'

function statusVariant(status: WithdrawalStatus) {
  if (status === 'completed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
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

export default function AdminWithdrawalsPage() {
  const { token } = useAuthenticatedSession()
  const [rows, setRows] = useState<AdminWithdrawalRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        setRows(await api.adminWithdrawals(token, 100, signal))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load withdrawals')
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Withdrawals</h1>
        <p className="text-dim mt-1 text-sm">Cash-out requests across every merchant.</p>
      </header>

      <div className="mt-6">
        <AdminTable
          rows={rows}
          error={error}
          onRetry={() => void load()}
          getRowKey={(row) => row.id}
          emptyMessage="No withdrawals yet."
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
              header: 'Status',
              render: (row) => (
                <Badge variant={statusVariant(row.status)} className="capitalize">
                  {row.status}
                </Badge>
              ),
            },
            {
              header: 'Bank',
              render: (row) =>
                row.bank_code && row.account_number ? (
                  <span className="text-dim text-xs">
                    {row.bank_code} · {row.account_number}
                  </span>
                ) : (
                  <span className="text-dim">—</span>
                ),
            },
            {
              header: 'Failure reason',
              render: (row) =>
                row.failure_reason ? (
                  <span className="text-destructive text-xs">{row.failure_reason}</span>
                ) : (
                  <span className="text-dim">—</span>
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
