'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'
import { api, ApiError, type Balance, type Payment, type Refund } from '@/lib/api'
import { exportPaymentsToCSV } from '@/lib/export'
import { formatStroops } from '@/lib/money'
import { paymentStatusLabel, paymentStatusVariant } from '@/lib/payment-status'
import { useAuthenticatedSession } from '@/components/session-provider'

/** Testnet today; swap for `public` when the backend points at mainnet Horizon. */
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function downloadPaymentsCsv(payments: Payment[]): void {
  const blob = new Blob([exportPaymentsToCSV(payments)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `aframp-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function TransactionsPage() {
  const { token } = useAuthenticatedSession()
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [limit, setLimit] = useState(50)
  const [balances, setBalances] = useState<Balance[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal, l: number = limit) => {
      setError(null)
      try {
        const [nextPayments, nextBalances, nextRefunds] = await Promise.all([
          api.listTransactions(token, l, signal),
          api.getBalances(token, signal),
          api.listRefunds(token, 20, signal),
        ])
        setPayments(nextPayments)
        setBalances(nextBalances)
        setRefunds(nextRefunds)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 0) {
          setError('backend-down')
          return
        }
        setError(cause instanceof Error ? cause.message : 'Could not load your payments')
      }
    },
    [token, limit]
  )

  const handleRefund = useCallback(
    async (payment: Payment) => {
      const confirmed = window.confirm(
        `Refund ${formatStroops(payment.amount_stroops)} ${payment.asset} to ${payment.wallet_address}?`
      )
      if (!confirmed) return

      setRefundingId(payment.id)
      try {
        const refund = await api.createRefund(
          token,
          payment.id,
          payment.amount_stroops,
          payment.wallet_address,
          'merchant refund'
        )
        setRefunds((current) => [refund, ...current])
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not create the refund request')
      } finally {
        setRefundingId(null)
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (error)
    return (
      <ErrorState
        message={
          error === 'backend-down'
            ? "We can't connect to the payment server right now. Please try again in a moment."
            : error
        }
        onRetry={() => void load()}
      />
    )
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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={payments.length === 0}
            onClick={() => downloadPaymentsCsv(payments)}
          >
            <Download className="mr-2 size-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
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
              <div className="flex items-center gap-2">
                {payment.status === 'confirmed' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRefund(payment)}
                    disabled={refundingId === payment.id}
                  >
                    {refundingId === payment.id ? 'Refunding…' : 'Refund'}
                  </Button>
                )}
                <Badge variant={paymentStatusVariant(payment.status)}>
                  {paymentStatusLabel(payment.status)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
      {payments && payments.length >= limit && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 50)}>
            Load more
          </Button>
        </div>
      )}

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Refunds</h2>
        {refunds.length === 0 ? (
          <p className="text-dim text-sm">No refunds yet.</p>
        ) : (
          <ul className="border-hairline divide-y rounded-2xl border">
            {refunds.map((refund) => (
              <li key={refund.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="tabular-nums font-medium">
                  {formatStroops(refund.amount_stroops)} {refund.asset}
                </span>
                <Badge variant={refund.status === 'completed' ? 'default' : 'secondary'}>
                  {refund.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
