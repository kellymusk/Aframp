'use client'

import { useState } from 'react'
import { CheckCircle2, CircleAlert, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api, ApiError } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useOfframpOrderPolling } from '@/hooks/use-offramp-order-polling'
import type { OfframpOrder, OfframpOrderStatus } from '@/types/offramp'

const STEP_LABEL: Record<Exclude<OfframpOrderStatus, 'pending_bank_details'>, string> = {
  pending: 'Order received',
  processing: 'Sending payout',
  completed: 'Payout complete',
  failed: 'Payout failed',
}

const STEP_PROGRESS: Record<Exclude<OfframpOrderStatus, 'pending_bank_details'>, number> = {
  pending: 33,
  processing: 66,
  completed: 100,
  failed: 100,
}

interface OfframpStatusProps {
  order: OfframpOrder
}

export function OfframpStatus({ order: initialOrder }: OfframpStatusProps) {
  const { token } = useAuthenticatedSession()
  const { order, setOrder, error } = useOfframpOrderPolling(token, initialOrder)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  const status = order.status as Exclude<OfframpOrderStatus, 'pending_bank_details'>

  async function retry() {
    setRetrying(true)
    setRetryError(null)
    try {
      const next = await api.retryOfframpOrder(token, order.id)
      setOrder(next)
    } catch (cause) {
      setRetryError(cause instanceof ApiError ? cause.message : 'Could not retry this payout')
    } finally {
      setRetrying(false)
    }
  }

  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="text-success size-10" aria-hidden />
        <h2 className="text-lg font-bold">Payout complete</h2>
        <p className="text-2xl font-bold tabular-nums">
          {(order.payoutAmount ?? order.fees.receiveAmount).toLocaleString()} {order.fiatCurrency}
        </p>
        {order.payoutReference && (
          <p className="text-dim text-xs">Reference: {order.payoutReference}</p>
        )}
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CircleAlert className="text-destructive size-10" aria-hidden />
        <h2 className="text-lg font-bold">Payout failed</h2>
        <p className="text-dim text-sm">
          {order.failureReason ?? 'Something went wrong sending your payout.'}
        </p>
        {retryError && (
          <Alert variant="destructive">
            <AlertDescription>{retryError}</AlertDescription>
          </Alert>
        )}
        <Button onClick={retry} disabled={retrying} className="mt-2">
          <RotateCcw className="mr-2 size-4" aria-hidden />
          {retrying ? 'Retrying…' : 'Retry payout'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <h2 className="text-lg font-bold">{STEP_LABEL[status]}</h2>
      </div>
      <Progress value={STEP_PROGRESS[status]} />
      <p className="text-dim text-center text-sm">
        We&apos;ll update this page automatically — you can leave and come back anytime.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
