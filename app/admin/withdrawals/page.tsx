'use client'

import { useCallback, useState } from 'react'
import { AdminTable } from '@/components/admin/admin-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, type WithdrawalStatus } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useAdminCursorPagination } from '@/hooks/use-admin-cursor-pagination'
import { WithdrawalActionDialog } from './withdrawal-action-dialog'

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

type WithdrawalAction = 'retry' | 'resolve' | 'note'

export default function AdminWithdrawalsPage() {
  const { token } = useAuthenticatedSession()
  const { rows, error, hasNextPage, isLoadingMore, loadMore, retry, refreshRow } =
    useAdminCursorPagination(
      useCallback(
        (cursor, pageSize, signal) =>
          api.adminWithdrawals(token, cursor, pageSize, signal),
        [token]
      )
    )
  const [pendingAction, setPendingAction] = useState<{
    action: WithdrawalAction
    withdrawalId: string
  } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Withdrawals</h1>
        <p className="text-dim mt-1 text-sm">Cash-out requests across every merchant.</p>
      </header>

      {actionSuccess ? (
        <p role="status" className="mt-4 text-sm text-green-600">
          {actionSuccess}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-destructive mt-4 text-sm">
          {actionError}
        </p>
      ) : null}

      <div className="mt-6">
        <AdminTable
          rows={rows}
          error={error}
          onRetry={retry}
          hasNextPage={hasNextPage}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
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
            {
              header: 'Actions',
              render: (row) =>
                row.status === 'failed' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionError(null)
                        setActionSuccess(null)
                        setPendingAction({ action: 'retry', withdrawalId: row.id })
                      }}
                    >
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionError(null)
                        setActionSuccess(null)
                        setPendingAction({ action: 'resolve', withdrawalId: row.id })
                      }}
                    >
                      Mark resolved
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActionError(null)
                        setActionSuccess(null)
                        setPendingAction({ action: 'note', withdrawalId: row.id })
                      }}
                    >
                      Add note
                    </Button>
                  </div>
                ) : (
                  <span className="text-dim">—</span>
                ),
            },
          ]}
        />
      </div>

      {pendingAction ? (
        <WithdrawalActionDialog
          action={pendingAction.action}
          withdrawalId={pendingAction.withdrawalId}
          token={token}
          onClose={() => setPendingAction(null)}
          onSuccess={(message) => {
            setPendingAction(null)
            setActionSuccess(message)
            refreshRow(pendingAction.withdrawalId)
          }}
          onError={(message) => {
            setPendingAction(null)
            setActionError(message)
          }}
        />
      ) : null}
    </div>
  )
}
