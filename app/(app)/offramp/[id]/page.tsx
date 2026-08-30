'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { BankDetailsForm } from '@/components/offramp/bank-details-form'
import { OfframpStatus } from '@/components/offramp/offramp-status'
import { api, ApiError } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import type { OfframpOrder } from '@/types/offramp'

export default function OfframpOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { token } = useAuthenticatedSession()
  const [order, setOrder] = useState<OfframpOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const next = await api.getOfframpOrder(token, id, signal)
        setOrder(next)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof ApiError ? cause.message : 'Could not load this order')
      }
    },
    [token, id]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      {order.status === 'pending_bank_details' ? (
        <BankDetailsForm order={order} onSubmitted={setOrder} />
      ) : (
        <OfframpStatus order={order} />
      )}
    </div>
  )
}
