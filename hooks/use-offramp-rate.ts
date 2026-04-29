'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OfframpAsset, OfframpChain } from '@/types/offramp'

const RATE_REFRESH_SECONDS = 30

const rateMap: Record<OfframpAsset, number> = {
  cNGN: 1584,
  USDC: 1500,
  USDT: 1490,
  XLM: 420,
}

export function useOfframpRate(asset: OfframpAsset, chain: OfframpChain) {
  const [countdown, setCountdown] = useState(RATE_REFRESH_SECONDS)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const rate = useMemo(() => {
    const chainMultiplier =
      chain === 'Ethereum' ? 1.01 : chain === 'Polygon' ? 0.995 : chain === 'Base' ? 1.002 : 1
    return rateMap[asset] * chainMultiplier
  }, [asset, chain])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      setLastUpdated(Date.now())
      setIsLoading(false)
      setCountdown(RATE_REFRESH_SECONDS)
    }, 350)
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => refresh())
  }, [asset, chain, refresh])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refresh()
          return RATE_REFRESH_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  return {
    rate,
    countdown,
    lastUpdated,
    isLoading,
    refresh,
  }
}
