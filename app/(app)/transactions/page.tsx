'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'
import {
  api,
  ApiError,
  type Balance,
  type Payment,
  type PaymentStatus,
  type Refund,
} from '@/lib/api'
import { formatStroops, parseAmountToStroops } from '@/lib/money'
import {
  filterPaymentsByDateRange,
  filterPaymentsByStatus,
  searchPayments,
} from '@/lib/transaction-filters'
import { useAuthenticatedSession } from '@/components/session-provider'
import { formatDateTime } from '@/lib/format-date'

const EXPLORER_BASE = `https://stellar.expert/explorer/${
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet'
}/tx`

const STATUS_LABEL: Record<PaymentStatus, string> = {
  detected: 'Detected',
  verified: 'Verifying',
  confirmed: 'Paid',
  failed: 'Failed',
}

const FILTERABLE_STATUSES: PaymentStatus[] = ['detected', 'verified', 'confirmed', 'failed']

function DebouncedSearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => onSearch(query), 250)
    return () => window.clearTimeout(timeout)
  }, [onSearch, query])

  return (
    <Input
      id="transaction-search"
      type="search"
      placeholder="Hash, wallet address, or asset"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
    />
  )
}

function statusVariant(status: PaymentStatus) {
  if (status === 'confirmed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}

export default function TransactionsPage() {
  const { token } = useAuthenticatedSession()
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [balances, setBalances] = useState<Balance[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refundNotice, setRefundNotice] = useState<string | null>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundRecipient, setRefundRecipient] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundFormError, setRefundFormError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        const [nextPayments, nextBalances, nextRefunds] = await Promise.all([
          api.listTransactions(token, 50, signal),
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
    [token]
  )

  const openRefundDialog = useCallback((payment: Payment) => {
    setRefundTarget(payment)
    setRefundAmount('')
    setRefundRecipient(payment.wallet_address)
    setRefundReason('')
    setRefundFormError(null)
    setRefundDialogOpen(true)
  }, [])

  const handleRefund = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!refundTarget) return

      const cleanedAmount = refundAmount.trim()
      const cleanedRecipient = refundRecipient.trim()
      const cleanedReason = refundReason.trim()
      const amountStroops = parseAmountToStroops(cleanedAmount)

      if (!cleanedAmount || !amountStroops) {
        setRefundFormError('Enter a valid refund amount.')
        return
      }

      if (amountStroops <= 0n) {
        setRefundFormError('Refund amount must be greater than zero.')
        return
      }

      if (amountStroops > refundTarget.amount_stroops) {
        setRefundFormError('Refund amount cannot exceed the original payment amount.')
        return
      }

      if (!cleanedRecipient) {
        setRefundFormError('Recipient address is required.')
        return
      }

      setRefundingId(refundTarget.id)
      setRefundFormError(null)
      try {
        const refund = await api.createRefund(
          token,
          refundTarget.id,
          amountStroops,
          cleanedRecipient,
          cleanedReason || undefined
        )
        setRefundNotice(
          `Refund requested successfully for ${formatStroops(refund.amount_stroops)} ${refund.asset}.`
        )
        setRefundDialogOpen(false)
        setRefundTarget(null)
        setRefundAmount('')
        setRefundRecipient('')
        setRefundReason('')
        setRefunds((current) => [refund, ...current])
        await load()
      } catch (cause) {
        setRefundFormError(
          cause instanceof Error ? cause.message : 'Could not create the refund request'
        )
      } finally {
        setRefundingId(null)
      }
    },
    [load, refundAmount, refundRecipient, refundReason, refundTarget, token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const filteredPayments = useMemo(() => {
    if (!payments) return []
    const searched = searchPayments(payments, searchQuery)
    const statusFiltered = filterPaymentsByStatus(searched, statusFilter)
    return filterPaymentsByDateRange(statusFiltered, fromDate, toDate)
  }, [payments, searchQuery, statusFilter, fromDate, toDate])

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
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        {refundNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {refundNotice}
          </div>
        )}
        {balances.length > 0 && (
          <ul aria-live="polite" aria-atomic="true" className="grid gap-2 sm:grid-cols-2">
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

      {payments.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="transaction-search">Search</Label>
            <DebouncedSearchInput onSearch={setSearchQuery} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="transaction-status">Status</Label>
            <select
              id="transaction-status"
              className="border-hairline bg-panel h-9 w-full rounded-md border px-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | 'all')}
            >
              <option value="all">All</option>
              {FILTERABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="transaction-from">From</Label>
              <Input
                id="transaction-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="transaction-to">To</Label>
              <Input
                id="transaction-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <EmptyStateIllustration variant="empty" className="size-20" />
          <p className="text-dim text-sm">
            No payments yet. Charge a customer and they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="border-hairline mt-6 divide-y">
          {filteredPayments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 space-y-1">
                <p className="text-base font-bold tabular-nums text-white">
                  {formatStroops(payment.amount_stroops)} {payment.asset}
                </p>
                <p className="text-dim text-xs">
                  {formatDateTime(payment.created_at)} ·{' '}
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
                    onClick={() => openRefundDialog(payment)}
                    disabled={refundingId === payment.id}
                  >
                    {refundingId === payment.id ? 'Refunding…' : 'Refund'}
                  </Button>
                )}
                <Badge
                  variant={statusVariant(payment.status)}
                  role="status"
                  aria-live="polite"
                  aria-label={`Payment status: ${STATUS_LABEL[payment.status] ?? payment.status}`}
                >
                  {STATUS_LABEL[payment.status] ?? payment.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={refundDialogOpen}
        onOpenChange={(open) => {
          setRefundDialogOpen(open)
          if (!open) {
            setRefundTarget(null)
            setRefundAmount('')
            setRefundRecipient('')
            setRefundReason('')
            setRefundFormError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund payment</DialogTitle>
            <DialogDescription>
              Enter the refund amount and recipient for this confirmed payment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund amount</Label>
              <Input
                id="refund-amount"
                type="text"
                inputMode="decimal"
                placeholder={`Up to ${formatStroops(refundTarget?.amount_stroops ?? 0n)} ${refundTarget?.asset ?? ''}`}
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                aria-invalid={Boolean(refundFormError)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-recipient">Recipient address</Label>
              <Input
                id="refund-recipient"
                type="text"
                value={refundRecipient}
                onChange={(event) => setRefundRecipient(event.target.value)}
                aria-invalid={Boolean(refundFormError)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason (optional)</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                rows={3}
                placeholder="Customer requested a refund"
              />
            </div>
            {refundFormError && <p className="text-sm text-destructive">{refundFormError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={refundingId !== null || !refundTarget}>
                {refundingId === refundTarget?.id ? 'Refunding…' : 'Confirm refund'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Refunds</h2>
        {refunds.length === 0 ? (
          <p className="text-dim text-sm">No refunds yet.</p>
        ) : (
          <ul className="border-hairline divide-y rounded-2xl border">
            {refunds.map((refund) => (
              <li
                key={refund.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="tabular-nums font-medium">
                  {formatStroops(refund.amount_stroops)} {refund.asset}
                </span>
                <Badge
                  variant={refund.status === 'completed' ? 'default' : 'secondary'}
                  role="status"
                  aria-live="polite"
                  aria-label={`Refund status: ${refund.status}`}
                >
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
