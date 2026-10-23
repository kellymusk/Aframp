'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'
import { api, ApiError, type Remittance } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { formatDateTime } from '@/lib/format-date'

const EXPLORER_BASE = 'https://stellar.expert/explorer/public/tx'

const PAGE_SIZE = 10

const STATUS_LABEL: Record<Remittance['status'], string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  failed: 'Failed',
}

const STATUS_OPTIONS: Array<{ value: Remittance['status'] | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: STATUS_LABEL.pending },
  { value: 'submitted', label: STATUS_LABEL.submitted },
  { value: 'confirmed', label: STATUS_LABEL.confirmed },
  { value: 'failed', label: STATUS_LABEL.failed },
]

function statusVariant(status: Remittance['status']) {
  if (status === 'confirmed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}

export default function RemittancesPage() {
  const { token } = useAuthenticatedSession()
  const [remittances, setRemittances] = useState<Remittance[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<Remittance['status'] | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        const nextRemittances = await api.listRemittances(token, 50, signal)
        setRemittances(nextRemittances)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 0) {
          setError('backend-down')
          return
        }
        setError(cause instanceof Error ? cause.message : 'Could not load your remittances')
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const filtered = useMemo(() => {
    if (!remittances) return []
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null
    return remittances.filter((remittance) => {
      if (statusFilter !== 'all' && remittance.status !== statusFilter) return false
      const created = new Date(remittance.created_at).getTime()
      if (from !== null && created < from) return false
      if (to !== null && created > to) return false
      return true
    })
  }, [remittances, statusFilter, fromDate, toDate])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  const resetPage = () => setPage(0)

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
  if (!remittances) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Remittances</h1>
        <p className="text-dim text-sm">History of all money sends</p>
      </header>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-dim">
          Status
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as Remittance['status'] | 'all')
              resetPage()
            }}
            className="border-hairline rounded-lg bg-transparent px-3 py-2 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value)
              resetPage()
            }}
            className="border-hairline rounded-lg bg-transparent px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          To
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value)
              resetPage()
            }}
            className="border-hairline rounded-lg bg-transparent px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <EmptyStateIllustration variant="empty" className="size-20" />
          <p className="text-dim text-sm">
            {remittances.length === 0
              ? 'No remittances yet. Send money to get started.'
              : 'No remittances match these filters.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="border-hairline mt-6 divide-y">
            {pageItems.map((remittance) => (
              <li key={remittance.id} className="space-y-2 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-bold tabular-nums text-white">
                      {formatStroops(remittance.amount_stroops)} {remittance.asset}
                    </p>
                    <p className="text-dim text-xs font-mono truncate">
                      {remittance.destination_address}
                    </p>
                    <p className="text-dim text-xs">
                      {formatDateTime(remittance.created_at)}
                      {remittance.tx_hash && (
                        <>
                          {' '}
                          ·{' '}
                          <a
                            href={`${EXPLORER_BASE}/${remittance.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-bright underline underline-offset-2"
                          >
                            Receipt
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <Badge variant={statusVariant(remittance.status)} className="flex-shrink-0">
                    {STATUS_LABEL[remittance.status] ?? remittance.status}
                  </Badge>
                </div>
                {remittance.failure_reason && (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 border border-destructive/20">
                    <p className="text-xs text-destructive font-medium">
                      Failure reason: {remittance.failure_reason}
                    </p>
                  </div>
                )}
                {remittance.memo && (
                  <p className="text-xs text-muted-foreground">Memo: {remittance.memo}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-dim text-xs">
              Page {currentPage + 1} of {pageCount} · {filtered.length} result
              {filtered.length === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="border-hairline rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
                disabled={currentPage >= pageCount - 1}
                className="border-hairline rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
