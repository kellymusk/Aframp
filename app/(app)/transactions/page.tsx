'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'
import { api, ApiError, type Balance, type Payment, type PaymentStatus } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'

/** Testnet today; swap for `public` when the backend points at mainnet Horizon. */
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx'

const STATUS_LABEL: Record<PaymentStatus, string> = {
  detected: 'Detected',
  verified: 'Verifying',
  confirmed: 'Paid',
  failed: 'Failed',
}

function statusVariant(status: PaymentStatus) {
  if (status === 'confirmed') return 'default' as const
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

export default function TransactionsPage() {
  const { token } = useAuthenticatedSession()
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [balances, setBalances] = useState<Balance[]>([])
  const [error, setError] = useState<string | null>(null)
  const [boundaryError, setBoundaryError] = useState<Error | null>(null)

  // If a backend-unreachable error was captured, re-throw it synchronously
  // on the next render so the error boundary catches it.
  if (boundaryError) throw boundaryError

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        const [nextPayments, nextBalances] = await Promise.all([
          api.listTransactions(token, 50, signal),
          api.getBalances(token, signal),
        ])
        setPayments(nextPayments)
        setBalances(nextBalances)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 0) {
          // Capture backend-unreachable errors and re-throw synchronously during render.
          setBoundaryError(cause)
        } else setError(cause instanceof Error ? cause.message : 'Could not load your payments')
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
  if (!payments) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        {balances.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {balances.map((balance) => (
              <li
                key={balance.asset}
                className="bg-panel border-hairline flex items-baseline justify-between rounded-2xl border px-4 py-3"
              >
                <span className="text-dim text-sm">{balance.asset} available</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatStroops(balance.available)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </header>

      {payments.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <EmptyStateIllustration variant="empty" className="size-20" />
          <p className="text-dim text-sm">
            No payments yet. Charge a customer and they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="border-hairline mt-6 divide-y">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 space-y-1">
                <p className="text-base font-bold tabular-nums text-white">
                  {formatStroops(payment.amount_stroops)} {payment.asset}
                </p>
                <p className="text-dim text-xs">
                  {formatWhen(payment.created_at)} ·{' '}
                  <a
                    href={`${EXPLORER_BASE}/${payment.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bright underline underline-offset-2"
                  >
                    Receipt
                  </a>
                </p>
              </div>
              <Badge variant={statusVariant(payment.status)}>
                {STATUS_LABEL[payment.status] ?? payment.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
