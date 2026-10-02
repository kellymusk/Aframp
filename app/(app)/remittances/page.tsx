'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'
import { api, ApiError, type Remittance } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { formatDateTime } from '@/lib/format-date'

const EXPLORER_BASE = 'https://stellar.expert/explorer/public/tx'

const STATUS_LABEL: Record<Remittance['status'], string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  failed: 'Failed',
}

function statusVariant(status: Remittance['status']) {
  if (status === 'confirmed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}

export default function RemittancesPage() {
  const { token } = useAuthenticatedSession()
  const [remittances, setRemittances] = useState<Remittance[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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

      {remittances.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <EmptyStateIllustration variant="empty" className="size-20" />
          <p className="text-dim text-sm">No remittances yet. Send money to get started.</p>
        </div>
      ) : (
        <ul className="border-hairline mt-6 divide-y">
          {remittances.map((remittance) => (
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
      )}
    </div>
  )
}
