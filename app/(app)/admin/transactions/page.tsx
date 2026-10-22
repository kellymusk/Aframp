'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api, type AdminTransactionRow } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { formatDateTime } from '@/lib/format-date'
import { PAYMENT_STATUS } from '@/lib/status'

/** Testnet today; swap for `public` when the backend points at mainnet Horizon. */
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx'

function shorten(value: string) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`
}

export default function AdminTransactionsPage() {
  const { token } = useAuthenticatedSession()
  const [rows, setRows] = useState<AdminTransactionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        setRows(await api.adminTransactions(token, 100, signal))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load transactions')
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
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-dim mt-1 text-sm">Incoming payments across every merchant.</p>
      </header>

      <div className="mt-6">
        <AdminTable
          rows={rows}
          error={error}
          onRetry={() => void load()}
          getRowKey={(row) => row.id}
          searchText={(row) =>
            `${row.merchant_name} ${row.tx_hash} ${row.asset} ${row.status} ${row.wallet_address}`
          }
          searchPlaceholder="Search merchant, hash, asset or status"
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
              render: (row) => <StatusBadge status={row.status} config={PAYMENT_STATUS} />,
            },
            { header: 'Confirmations', render: (row) => row.confirmations },
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
