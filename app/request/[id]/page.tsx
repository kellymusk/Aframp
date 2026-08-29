'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { Check, Clock, Copy, ExternalLink, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { CountdownTimer } from '@/components/onramp/countdown-timer'
import { api, ApiError, type PaymentRequest } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { useSession } from '@/components/session-provider'

/** The backend confirms a deposit within one Horizon poll cycle (60s default). */
const POLL_INTERVAL_MS = 3000

export default function PaymentRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { session } = useSession()
  const router = useRouter()
  const [request, setRequest] = useState<PaymentRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The countdown component fires this the moment its own clock hits zero,
  // so the customer sees "expired" immediately rather than waiting for the
  // next poll to catch up with the server's status.
  const [clientExpired, setClientExpired] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const next = await api.getPaymentRequest(id, signal)
        setRequest(next)
        setError(null)
        return next
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return null
        if (cause instanceof ApiError && cause.status === 0)
          setError("Can't reach the payment server. Please try again in a moment.")
        else setError(cause instanceof Error ? cause.message : 'Could not load this charge')
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

  async function regenerate() {
    if (!request) return
    if (!session) {
      router.push('/charge')
      return
    }
    setRegenerating(true)
    setRegenerateError(null)
    try {
      const next = await api.createPaymentRequest(
        session.token,
        request.amount_stroops,
        request.asset,
        undefined,
        request.memo || undefined
      )
      router.replace(`/request/${next.id}`)
    } catch (cause) {
      setRegenerateError(
        cause instanceof Error ? cause.message : 'Could not generate a new code'
      )
      setRegenerating(false)
    }
  }

  if (error && !request) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6">
        <ErrorState message={error} onRetry={() => void load()} />
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

  if (request.status === 'expired' || clientExpired) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="bg-muted text-muted-foreground flex size-20 items-center justify-center rounded-full">
          <Clock className="size-10" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            This payment code has expired
          </h1>
          <p className="text-muted-foreground text-sm">
            Nobody paid {amount} before the code ran out.
          </p>
        </div>
        {regenerateError && (
          <Alert variant="destructive">
            <AlertDescription>{regenerateError}</AlertDescription>
          </Alert>
        )}
        <Button size="lg" className="w-full" disabled={regenerating} onClick={regenerate}>
          {regenerating ? 'Generating…' : 'Generate new code'}
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/charge">Back to keypad</Link>
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

      {isValidSep7Uri(request.sep7_uri) ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <QRCode
              value={request.sep7_uri}
              size={224}
              level="M"
              title={`Pay ${amount} to ${request.address}`}
            />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            Scan with Freighter or Lobstr to open this payment in-wallet.
          </p>
          <div className="flex w-full gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href={request.sep7_uri}>
                <ExternalLink className="size-4" aria-hidden />
                Open in wallet
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => void copySep7Link(request.sep7_uri!)}
            >
              {linkCopied ? (
                <>
                  <Check className="size-4" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden /> Copy link
                </>
              )}
            </Button>
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

      <div className="flex justify-center" aria-live="polite">
        <CountdownTimer
          expiresAt={new Date(request.expires_at)}
          onExpire={() => setClientExpired(true)}
        />
      </div>

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
