'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Delete, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api, ApiError } from '@/lib/api'
import { DECIMALS, parseAmountToStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { type ExchangeRateState } from '@/types/onramp'
import { calculateFiatEquivalent } from '@/lib/charge'
import { cn } from '@/lib/utils'

/**
 * XLM rather than cNGN: the backend only emits a scannable SEP-0007 URI for
 * XLM today, because no cNGN issuer address is configured. A cNGN request
 * would come back with `sep7_uri: null` and nothing to show the customer.
 */
const ASSET = 'XLM'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'] as const

const REFRESH_INTERVAL_SECONDS = 30

export default function ChargePage() {
  const { token } = useAuthenticatedSession()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [allowPartial, setAllowPartial] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [rateState, setRateState] = useState<ExchangeRateState>({
    data: null,
    isLoading: false,
    error: null,
    countdown: REFRESH_INTERVAL_SECONDS,
    warning: null,
  })

  const fetchRate = useCallback(async () => {
    setRateState((prev) => ({ ...prev, isLoading: true }))
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=ngn'
      )
      if (!res.ok) throw new Error('API error')
      const json = (await res.json()) as { stellar?: { ngn?: number } }
      const rate = json?.stellar?.ngn
      if (typeof rate !== 'number') throw new Error('Invalid rate format')

      setRateState({
        data: {
          fiat: 'NGN',
          asset: 'XLM',
          rate,
          lastUpdated: Date.now(),
          source: 'coingecko',
        },
        isLoading: false,
        error: null,
        countdown: REFRESH_INTERVAL_SECONDS,
        warning: null,
      })
    } catch {
      setRateState((prev) => {
        if (prev.data) {
          return {
            ...prev,
            isLoading: false,
            error: 'Failed to refresh exchange rate',
            warning: 'Rate may be stale',
            countdown: REFRESH_INTERVAL_SECONDS,
          }
        }
        return {
          ...prev,
          isLoading: false,
          error: 'Unable to load current exchange rate',
          warning: null,
          countdown: REFRESH_INTERVAL_SECONDS,
        }
      })
    }
  }, [])

  useEffect(() => {
    void fetchRate()
  }, [fetchRate])

  useEffect(() => {
    const timer = setInterval(() => {
      setRateState((prev) => ({
        ...prev,
        countdown: prev.countdown > 1 ? prev.countdown - 1 : 0,
      }))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (rateState.countdown === 0) {
      void fetchRate()
    }
  }, [rateState.countdown, fetchRate])

  const stroops = parseAmountToStroops(input)
  const canCharge = stroops !== null && stroops > 0n && !submitting

  function press(key: (typeof KEYS)[number]) {
    setError(null)
    setInput((current) => {
      if (key === 'backspace') return current.slice(0, -1)
      if (key === '.') return current.includes('.') ? current : `${current || '0'}.`

      const [, fraction] = current.split('.')
      if (fraction !== undefined && fraction.length >= DECIMALS) return current
      if (current === '0') return key
      return current + key
    })
  }

  async function charge() {
    if (stroops === null || stroops <= 0n) return
    setSubmitting(true)
    setError(null)
    try {
      const request = await api.createPaymentRequest(token, stroops, ASSET, undefined, allowPartial)
      router.push(`/request/${request.id}`)
    } catch (cause) {
      if (cause instanceof ApiError && cause.message.includes('create a wallet')) {
        setError('Set up your payment address first, then come back here.')
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not create the charge')
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col gap-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
        <p className="text-dim text-xs font-bold tracking-widest uppercase">Amount to charge</p>
        <p className="flex items-baseline gap-2 tabular-nums">
          <span
            data-testid="charge-amount"
            className={cn('text-5xl font-bold tracking-tight', !input && 'text-dim')}
          >
            {input || '0'}
          </span>
          <span className="text-dim text-lg font-medium">{ASSET}</span>
        </p>
        <p className="text-dim max-w-xs text-center text-xs">
          Charges are in XLM for now so customers get a scannable code. Naira (cNGN) charges are
          coming.
        </p>

        {rateState.data && (
          <p className="text-dim text-sm font-medium tabular-nums" data-testid="fiat-equivalent">
            {calculateFiatEquivalent(input, rateState.data.rate)}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-dim">
          <span>
            {rateState.data ? (
              <>
                1 {ASSET} ≈ ₦
                {rateState.data.rate.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </>
            ) : rateState.isLoading ? (
              'Loading rate…'
            ) : (
              'Rate unavailable'
            )}
          </span>
          <span>•</span>
          <span>Refresh in {rateState.countdown}s</span>
          <button
            type="button"
            onClick={() => void fetchRate()}
            disabled={rateState.isLoading}
            aria-label="Refresh exchange rate"
            className="hover:text-foreground inline-flex items-center text-dim transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('size-3', rateState.isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {rateState.warning && (
        <Alert variant="notice" data-testid="stale-warning">
          <AlertDescription>{rateState.warning}</AlertDescription>
        </Alert>
      )}

      {rateState.error && !rateState.data && (
        <Alert variant="notice">
          <AlertDescription>{rateState.error}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <Button
            key={key}
            type="button"
            variant="secondary"
            onClick={() => press(key)}
            aria-label={key === 'backspace' ? 'Delete last digit' : key}
            className="h-16 text-xl font-medium"
          >
            {key === 'backspace' ? <Delete className="size-5" aria-hidden /> : key}
          </Button>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm text-dim">
        <span>Allow partial payment</span>
        <input
          type="checkbox"
          checked={allowPartial}
          onChange={(event) => setAllowPartial(event.target.checked)}
          aria-label="Allow partial payment"
          className="h-4 w-4 accent-primary"
        />
      </label>

      <Button size="lg" className="h-14 text-base" disabled={!canCharge} onClick={charge}>
        {submitting ? 'Creating charge…' : 'Show payment code'}
      </Button>
    </div>
  )
}
