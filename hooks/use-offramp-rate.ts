'use client'

import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import type { OfframpRateState } from '@/types/offramp'

/** Rate is re-quoted this often — mirrors the onramp flow's refresh cadence. */
const REFRESH_SECONDS = 30

/**
 * Fetches the offramp rate for an asset/fiat pair and keeps a countdown to
 * the next refresh, the same "quote about to expire" pattern the onramp flow
 * uses so users aren't surprised by a stale price at confirmation time.
 */
export function useOfframpRate(token: string, asset: string | null, fiatCurrency: string) {
  const [state, setState] = useState<OfframpRateState>({
    rate: 0,
    lastUpdated: 0,
    countdown: REFRESH_SECONDS,
    isLoading: true,
  })
  const [error, setError] = useState<string | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!asset) return

    let cancelled = false

    async function fetchRate() {
      setState((current) => ({ ...current, isLoading: true }))
      try {
        const response = await api.getOfframpRate(token, asset!, fiatCurrency)
        if (cancelled) return
        setError(null)
        setState({
          rate: response.rate,
          lastUpdated: response.lastUpdated,
          countdown: REFRESH_SECONDS,
          isLoading: false,
        })
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof ApiError ? cause.message : 'Could not fetch the exchange rate')
        setState((current) => ({ ...current, isLoading: false }))
      }
    }

    void fetchRate()
    const refreshTimer = setInterval(fetchRate, REFRESH_SECONDS * 1000)

    tickRef.current = setInterval(() => {
      setState((current) => ({ ...current, countdown: Math.max(0, current.countdown - 1) }))
    }, 1000)

    return () => {
      cancelled = true
      clearInterval(refreshTimer)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [token, asset, fiatCurrency])

  return { ...state, error }
}
