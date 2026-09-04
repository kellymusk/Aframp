'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { Check, Clock, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { api, ApiError, type PaymentRequest } from '@/lib/api'
import { formatStroops } from '@/lib/money'

/** The backend confirms a deposit within one Horizon poll cycle (60s default). */
const POLL_INTERVAL_MS = 3000

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export default function PaymentRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [request, setRequest] = useState<PaymentRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(0)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const next = await api.getPaymentRequest(id, signal)
        setRequest(next)
        setError(null)
        return next
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return null
        if (cause instanceof ApiError && cause.status === 0) {
          // Backend is temporarily unreachable — surface the error but do NOT
          // throw, so the polling loop can schedule another tick and recover.
          setError('backend-down')
          return null
        }
        setError(cause instanceof Error ? cause.message : 'Could not load this charge')
        return null
      }
    },
    [id]
  )

  // Poll while the customer hasn't paid yet; stop as soon as it settles.
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      const next = await load(controller.signal)
      if (controller.signal.aborted) return
      if (!next || next.status === 'pending') {
        timer = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }
    void tick()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [load])

  // Separate 1s ticker so the countdown moves independently of the poll.
  useEffect(() => {
    if (!request || request.status !== 'pending') return
    setRemaining(secondsUntil(request.expires_at))
    const timer = setInterval(() => setRemaining(secondsUntil(request.expires_at)), 1000)
    return () => clearInterval(timer)
  }, [request])

  if (error && !request) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6">
        <ErrorState
          message={
            error === 'backend-down'
              ? "We can't connect to the payment server right now. Please try again in a moment."
              : error
          }
          onRetry={() => void load()}
        />
      </main>
    )
  }

  if (!request) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner />
      </main>
    )
  }

  const amount = `${formatStroops(request.amount_stroops)} ${request.asset}`
  const paidAmount = request.amount_paid_stroops ?? 0n
  const paidRatio = request.amount_stroops > 0n ? Number((paidAmount * 100n) / request.amount_stroops) : 0
  const hasPartialPayment = request.allow_partial || paidAmount > 0n

  if (request.status === 'paid') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="bg-primary/15 text-primary flex size-20 items-center justify-center rounded-full">
          <Check className="size-10" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Payment received</h1>
          <p className="text-3xl font-semibold tabular-nums">{amount}</p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/charge">New charge</Link>
        </Button>
      </main>
    )
  }

  if (request.status === 'expired') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="bg-muted text-muted-foreground flex size-20 items-center justify-center rounded-full">
          <Clock className="size-10" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Charge expired</h1>
          <p className="text-muted-foreground text-sm">
            Nobody paid {amount} before the code ran out.
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/charge">Start a new charge</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <header className="space-y-1 text-center">
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Ask your customer to scan
        </p>
        <p className="font-display text-4xl font-semibold tracking-tight tabular-nums">{amount}</p>
      </header>

      {error && (
        <Alert>
          <TriangleAlert className="size-4" aria-hidden />
          <AlertDescription>
            {error === 'backend-down'
              ? "Can't reach the payment server — retrying automatically. The QR code is still valid."
              : error}
          </AlertDescription>
        </Alert>
      )}

      {request.sep7_uri ? (
        <div className="flex justify-center">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <QRCode
              value={request.sep7_uri}
              size={224}
              level="M"
              title={`Pay ${amount} to ${request.address}`}
            />
          </div>
        </div>
      ) : (
        <Alert>
          <TriangleAlert className="size-4" aria-hidden />
          <AlertDescription>
            No scannable code for {request.asset} yet. The customer must send {amount} to the
            address below and include the reference exactly.
          </AlertDescription>
        </Alert>
      )}

      {hasPartialPayment && (
        <div className="bg-muted/50 rounded-2xl p-4 text-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Paid so far</span>
            <span className="font-semibold tabular-nums">
              {formatStroops(paidAmount)} / {formatStroops(request.amount_stroops)} {request.asset}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, paidRatio))}%` }}
            />
          </div>
        </div>
      )}

      <dl className="bg-muted/50 space-y-3 rounded-2xl p-4 text-sm">
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">Pay to</dt>
          <dd className="font-heading text-xs break-all">{request.address}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">Reference (memo)</dt>
          <dd className="font-heading text-xs break-all">{request.memo}</dd>
        </div>
      </dl>

      <p
        className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
        aria-live="polite"
      >
        <Clock className="size-4" aria-hidden />
        Expires in <span className="tabular-nums">{formatCountdown(remaining)}</span>
      </p>

      <div className="space-y-2">
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/charge">Back to keypad</Link>
        </Button>
        {/* There's no cancel endpoint — a request can only expire on its own. */}
        <p className="text-muted-foreground text-center text-xs">
          This code stays payable until it expires.
        </p>
      </div>
    </main>
  )
}
