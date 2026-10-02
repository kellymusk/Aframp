'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Camera, AlertCircle, Clock, TriangleAlert } from 'lucide-react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { QRScanner } from '@/components/send/qr-scanner'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { api, ApiError, type PaymentRequest } from '@/lib/api'
import { formatStroops } from '@/lib/money'
import { formatDateTime } from '@/lib/format-date'

interface RequestPageClientProps {
  requestId: string
}

type CopyTarget = 'wallet' | 'paymentLink' | 'sep7'

export function RequestPageClient({ requestId }: RequestPageClientProps) {
  const router = useRouter()
  const [request, setRequest] = useState<PaymentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [copied, setCopied] = useState<CopyTarget | null>(null)
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [scannedAddress, setScannedAddress] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchRequest = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getPaymentRequest(requestId, signal)
        setRequest(data)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 404) {
          setError('Payment request not found.')
        } else if (cause instanceof ApiError && cause.status === 0) {
          setError("We can't reach the server right now. Check your connection and try again.")
        } else {
          setError(cause instanceof Error ? cause.message : 'Could not load this payment request.')
        }
      } finally {
        setLoading(false)
      }
    },
    [requestId]
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchRequest(controller.signal)
    return () => controller.abort()
  }, [fetchRequest])

  useEffect(
    () => () => {
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current)
    },
    []
  )

  const handleCopy = async (target: CopyTarget, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(target)
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current)
    copyFeedbackTimer.current = setTimeout(() => {
      setCopied((current) => (current === target ? null : current))
      copyFeedbackTimer.current = null
    }, 2000)
  }

  const handleScanPayment = async (address: string) => {
    setScannedAddress(address)
    setScannerOpen(false)

    // Validate address format (basic Stellar address validation)
    if (!/^G[A-Z0-9]{55}$/.test(address)) {
      setScanError('Invalid Stellar address format')
      return
    }

    setSubmitting(true)
    setScanError(null)

    try {
      // TODO: Replace mock with actual API endpoint when backend is ready:
      // await api.confirmScannedPayment(requestId, address)
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : 'Failed to confirm payment. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // ── Error state ──
  if (error || !request) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col min-h-screen relative">
          <header className="flex items-center gap-3 px-5 pt-6 pb-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight">Payment Request</h1>
          </header>
          <div className="flex flex-col flex-1 items-center justify-center px-5 gap-4 text-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <TriangleAlert className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              {error ?? 'This payment request could not be loaded.'}
            </p>
            <Button variant="outline" onClick={() => void fetchRequest()}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Expired state ──
  if (request.status === 'expired') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col min-h-screen relative">
          <header className="flex items-center gap-3 px-5 pt-6 pb-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight">Payment Request</h1>
          </header>
          <div className="flex flex-col flex-1 items-center justify-center px-5 gap-4 text-center">
            <div className="p-4 rounded-full bg-muted">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Request expired</h2>
            <p className="text-sm text-muted-foreground">
              This payment request expired on {formatDateTime(request.expires_at)}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Paid state ──
  if (request.status === 'paid') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col min-h-screen relative">
          <header className="flex items-center gap-3 px-5 pt-6 pb-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight">Payment Request</h1>
          </header>
          <div className="flex flex-col flex-1 items-center justify-center px-5 gap-4 text-center">
            <div className="p-4 rounded-full bg-emerald-500/10">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold">Payment received</h2>
            <p className="text-sm text-muted-foreground">
              {formatStroops(request.amount_stroops)} {request.asset} has been received.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const qrValue =
    request.sep7_uri ??
    `stellar:${request.address}?amount=${formatStroops(request.amount_stroops)}&asset=${request.asset}&memo=${request.memo}`

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold tracking-tight">Payment Request</h1>
        </header>

        <div className="flex flex-col flex-1 px-5 pb-8 gap-5">
          {/* ── Payment amount card ── */}
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Amount requested
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {formatStroops(request.amount_stroops)}
              </span>
              <span className="text-lg text-muted-foreground">{request.asset}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              on Stellar network via {request.asset}
            </p>
          </div>

          {/* ── Request details ── */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
            {request.memo && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  Reference
                </p>
                <p className="text-sm text-foreground">{request.memo}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Expires
              </p>
              <p className="text-sm text-foreground">{formatDateTime(request.expires_at)}</p>
            </div>
          </div>

          {/* ── QR Code card ── */}
          <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-border/60 bg-card">
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <QRCode
                value={qrValue}
                size={200}
                style={{ display: 'block' }}
                viewBox="0 0 256 256"
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Scan with {request.asset} wallet to pay this request
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button
                onClick={() => void handleCopy('paymentLink', window.location.href)}
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 w-full gap-2 transition-all',
                  copied === 'paymentLink' &&
                    'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                )}
              >
                {copied === 'paymentLink' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy payment link
                  </>
                )}
              </Button>
              <Button
                onClick={() => void handleCopy('sep7', qrValue)}
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 w-full gap-2 transition-all',
                  copied === 'sep7' && 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                )}
              >
                {copied === 'sep7' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy SEP-7 URI
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ── Wallet address ── */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Payment address
              </p>
              <p className="font-mono text-xs break-all leading-relaxed text-foreground">
                {request.address}
              </p>
            </div>
            <div className="px-4 pb-4 flex gap-2 mt-2">
              <Button
                onClick={() => void handleCopy('wallet', request.address)}
                variant="outline"
                size="sm"
                className={cn(
                  'flex-1 h-9 gap-2 transition-all',
                  copied === 'wallet' && 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                )}
              >
                {copied === 'wallet' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ── Mobile camera button ── */}
          {isMobile && (
            <Button
              onClick={() => setScannerOpen(true)}
              disabled={submitting}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex gap-2 disabled:opacity-40"
            >
              <Camera className="w-5 h-5" />
              {submitting ? 'Confirming...' : 'Pay with camera'}
            </Button>
          )}

          {scanError && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Error</p>
                <p className="text-xs text-red-600 mt-1">{scanError}</p>
              </div>
            </div>
          )}

          {/* ── Scanned address confirmation ── */}
          {scannedAddress && !scanError && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Payment detected</p>
                <p className="text-xs text-emerald-600 mt-1">
                  From: {scannedAddress.slice(0, 10)}...{scannedAddress.slice(-10)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QR Scanner Modal ── */}
      {scannerOpen && (
        <QRScanner onScan={handleScanPayment} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  )
}
