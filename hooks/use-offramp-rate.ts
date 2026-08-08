'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FiatCurrency } from '@/types/onramp'
import type { OfframpAsset, OfframpChain } from '@/types/offramp'
import { recordDataUpdate } from '@/lib/offline/connectivity'

const SSE_URL = '/api/exchange-rate/stream'
const MAX_SPARKLINE_POINTS = 30

const coinGeckoIds: Record<OfframpAsset, string> = {
  cNGN: 'usd-coin',
  USDC: 'usd-coin',
  USDT: 'tether',
  XLM: 'stellar',
}

const fiatCurrencyKeys: Record<FiatCurrency, string> = {
  NGN: 'ngn',
  KES: 'kes',
  GHS: 'ghs',
  ZAR: 'zar',
  UGX: 'ugx',
}

export function useOfframpRate(
  asset: OfframpAsset,
  chain: OfframpChain,
  fiatCurrency: FiatCurrency
) {
  const [countdown, setCountdown] = useState(30)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rate, setRate] = useState(0)
  const [sparkline, setSparkline] = useState<number[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateFromPayload = useCallback(
    (payload: {
      'usd-coin': Record<string, number>
      stellar: Record<string, number>
      tether: Record<string, number>
      timestamp: number
    }) => {
      const coinId = coinGeckoIds[asset]
      const fiatKey = fiatCurrencyKeys[fiatCurrency]
      const baseRate = payload[coinId]?.[fiatKey] ?? 0

      if (!baseRate) return

      const chainMultiplier =
        chain === 'Ethereum' ? 1.01 : chain === 'Polygon' ? 0.995 : chain === 'Base' ? 1.002 : 1

      const finalRate = baseRate * chainMultiplier

      recordDataUpdate(payload.timestamp)
      setRate(finalRate)
      setLastUpdated(payload.timestamp)
      setCountdown(30)
      setIsLoading(false)

      setSparkline((prev) => [...prev, finalRate].slice(-MAX_SPARKLINE_POINTS))
    },
    [asset, chain, fiatCurrency]
  )

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    const es = new EventSource(SSE_URL)
    eventSourceRef.current = es

    es.addEventListener('snapshot', (event) => {
      const payload = JSON.parse(event.data)
      updateFromPayload(payload)
    })

    es.addEventListener('update', (event) => {
      const payload = JSON.parse(event.data)
      updateFromPayload(payload)
    })

    es.addEventListener('error', (event) => {
      const data = (event as MessageEvent).data
      const parsed = data ? JSON.parse(data) : { message: 'Stream error' }
      console.warn('Offramp SSE error:', parsed.message)
    })

    es.onerror = () => {
      es.close()
      reconnectTimerRef.current = setTimeout(() => {
        connectSSE()
      }, 5000)
    }
  }, [updateFromPayload])

  useEffect(() => {
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
  }, [connectSSE])

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const refresh = useCallback(() => {
    connectSSE()
  }, [connectSSE])

  return {
    rate,
    countdown,
    lastUpdated,
    isLoading,
    refresh,
    sparkline,
  }
}
