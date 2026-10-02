'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { Check, Clock, Copy, TriangleAlert } from 'lucide-react'
import { AframpMark } from '@/components/brand/aframp-mark'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { api, ApiError, type PaymentRequest } from '@/lib/api'
import { formatStroops } from '@/lib/money'

/** The backend confirms a deposit within one Horizon poll cycle (60s default). */
const POLL_INTERVAL_MS = 3000

/** Stop polling after this many consecutive failed loads. */
const MAX_CONSECUTIVE_ERRORS = 3

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/** One labelled value the customer has to enter exactly, with a copy button. */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (e.g. insecure context): the value stays selectable.
    }
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="font-heading text-xs break-all select-all">{value}</dd>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => void copy()}
        aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
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
    let consecutiveErrors = 0

    const tick = async () => {
      const next = await load(controller.signal)
      if (controller.signal.aborted) return

      if (next) {
        // Successful load — reset the backoff counter.
        consecutiveErrors = 0
      } else {
        consecutiveErrors += 1
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          // Give up polling and let the user retry manually.
          setError('backend-down')
          return
        }
      }

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
  const paidRatio =
    request.amount_stroops > 0n ? Number((paidAmount * 100n) / request.amount_stroops) : 0
  const hasPartialPayment = request.allow_partial || paidAmount > 0n

  if (request.status === 'paid') {
    return (
      <main className="font-brand mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
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
      <main className="font-brand mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
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
    <main className="font-brand mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex items-center justify-center gap-2">
        <AframpMark className="size-7" />
        <span className="text-sm font-bold tracking-tight">Aframp</span>
      </div>
      <header className="space-y-1 text-center">
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          {request.sep7_uri ? 'Ask your customer to scan' : 'Ask your customer to pay'}
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

      <dl className="bg-muted/50 space-y-4 rounded-2xl p-4 text-sm">
        <CopyField label="Amount" value={formatStroops(request.amount_stroops)} />
        <CopyField label="Pay to" value={request.address} />
        <CopyField label="Reference (memo)" value={request.memo} />
      </dl>
      <p className="text-muted-foreground -mt-3 text-center text-xs">
        The reference must be included exactly, or the payment can&apos;t be matched to this charge.
      </p>

      <p
        className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
        aria-live="polite"
      >
        <Clock className="size-4" aria-hidden />
        {remaining > 0 ? `Expires in ${formatCountdown(remaining)}` : 'Expiring…'}
      </p>
    </main>
  )
}
