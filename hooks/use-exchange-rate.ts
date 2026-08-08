'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CryptoAsset,
  ExchangeRateResult,
  ExchangeRateState,
  FiatCurrency,
} from '@/types/onramp'
import { formatRate } from '@/lib/calculations'
import { recordDataUpdate } from '@/lib/offline/connectivity'

const STORAGE_KEY = 'onramp:rates'
const SPARKLINE_STORAGE_KEY = 'onramp:sparkline'
const SSE_URL = '/api/exchange-rate/stream'
const MAX_SPARKLINE_POINTS = 30 // keep last 30 data points (5 mins at 10 s intervals)

function buildRateResult(
  fiat: FiatCurrency,
  asset: CryptoAsset,
  usdcPrice: number,
  xlmPrice: number,
  source: 'coingecko' | 'cache',
  lastUpdated: number
): ExchangeRateResult {
  const assetLower = asset.toLowerCase()
  const isXlm = assetLower === 'xlm'
  const rate = isXlm ? 1 / xlmPrice : 1 / usdcPrice

  return {
    fiat,
    asset,
    rate,
    source,
    lastUpdated,
  }
}

export interface ExchangeRateHook extends ExchangeRateState {
  refresh: () => void
  displayRate: string
  sparkline: number[]
}

export function useExchangeRate(fiat: FiatCurrency, asset: CryptoAsset): ExchangeRateHook {
  const [state, setState] = useState<ExchangeRateState>({
    data: null,
    isLoading: true,
    error: null,
    warning: null,
    countdown: 30,
  })
  const [sparkline, setSparkline] = useState<number[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateFromPayload = useCallback(
    (
      payload: {
        'usd-coin': Record<string, number>
        stellar: Record<string, number>
        timestamp: number
      },
      source: 'coingecko' | 'cache'
    ) => {
      const lower = fiat.toLowerCase()
      const usdcPrice = payload['usd-coin']?.[lower]
      const xlmPrice = payload.stellar?.[lower]
      if (!usdcPrice || !xlmPrice) return

      const result = buildRateResult(fiat, asset, usdcPrice, xlmPrice, source, payload.timestamp)
      recordDataUpdate(result.lastUpdated)

      setState((prev) => ({
        ...prev,
        data: result,
        isLoading: false,
        error: null,
        warning: source === 'cache' ? 'Using cached exchange rate.' : null,
        countdown: 30,
      }))

      // Update sparkline
      setSparkline((prev) => {
        const next = [...prev, result.rate].slice(-MAX_SPARKLINE_POINTS)
        try {
          localStorage.setItem(SPARKLINE_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // ignore quota errors
        }
        return next
      })

      // Persist to localStorage
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ timestamp: result.lastUpdated, data: payload })
        )
      } catch {
        // ignore quota errors
      }
    },
    [asset, fiat]
  )

  const connectSSE = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    const es = new EventSource(SSE_URL)
    eventSourceRef.current = es

    es.addEventListener('snapshot', (event) => {
      const payload = JSON.parse(event.data)
      updateFromPayload(payload, 'coingecko')
    })

    es.addEventListener('update', (event) => {
      const payload = JSON.parse(event.data)
      updateFromPayload(payload, 'coingecko')
    })

    es.addEventListener('error', (event) => {
      const data = (event as MessageEvent).data
      const parsed = data ? JSON.parse(data) : { message: 'Stream connection lost' }
      console.warn('SSE error:', parsed.message)

      // Use cached data on stream error
      const cachedRaw = localStorage.getItem(STORAGE_KEY)
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw)
          updateFromPayload(cached.data, 'cache')
        } catch {
          // ignore parse errors
        }
      }

      setState((prev) => ({
        ...prev,
        warning: 'Using cached rates. Real-time updates paused.',
      }))
    })

    es.onerror = () => {
      es.close()
      setState((prev) => ({
        ...prev,
        warning: 'Reconnecting to live rates...',
      }))

      // Reconnect after 5 seconds
      reconnectTimerRef.current = setTimeout(() => {
        connectSSE()
      }, 5000)
    }
  }, [updateFromPayload])

  // Initial mount: load cache + connect SSE
  useEffect(() => {
    // Load cached rates
    const cachedRaw = localStorage.getItem(STORAGE_KEY)
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw)
        updateFromPayload(cached.data, 'cache')
      } catch {
        // ignore
      }
    }

    // Load cached sparkline
    const sparklineRaw = localStorage.getItem(SPARKLINE_STORAGE_KEY)
    if (sparklineRaw) {
      try {
        setSparkline(JSON.parse(sparklineRaw))
      } catch {
        // ignore
      }
    }

    connectSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [connectSSE, updateFromPayload])

  // Countdown timer (UI only)
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        countdown: prev.countdown > 0 ? prev.countdown - 1 : 30,
      }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const refresh = useCallback(() => {
    // Reconnect SSE to force a fresh fetch
    connectSSE()
  }, [connectSSE])

  const displayRate = useMemo(() => {
    if (!state.data) return ''
    return `1 ${state.data.fiat} = ${formatRate(state.data.rate)} ${state.data.asset}`
  }, [state.data])

  return {
    ...state,
    refresh,
    displayRate,
    sparkline,
  }
}
