"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CryptoAsset, ExchangeRateResult, ExchangeRateState, FiatCurrency } from "@/types/onramp"
import { formatRate } from "@/lib/onramp/formatters"

const API_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,stellar&vs_currencies=ngn,kes,ghs,zar,ugx"

const STORAGE_KEY = "onramp:rates"
const COUNTDOWN_START = 30

function buildRateResult(
  fiat: FiatCurrency,
  asset: CryptoAsset,
  usdcPrice: number,
  xlmPrice: number,
  source: "coingecko" | "cache",
  lastUpdated: number
): ExchangeRateResult {
  const assetLower = asset.toLowerCase()
  const isXlm = assetLower === "xlm"
  const rate = isXlm ? 1 / xlmPrice : 1 / usdcPrice

  return {
    fiat,
    asset,
    rate,
    source,
    lastUpdated,
  }
}

async function fetchWithRetry(retries: number) {
  let attempt = 0
  let lastError: Error | null = null

  while (attempt < retries) {
    try {
      const response = await fetch(API_URL)
      if (!response.ok) {
        throw new Error(`Exchange rate request failed: ${response.status}`)
      }
      return (await response.json()) as {
        "usd-coin": Record<string, number>
        stellar: Record<string, number>
      }
    } catch (error) {
      lastError = error as Error
      const delay = 300 * 2 ** attempt
      await new Promise((resolve) => setTimeout(resolve, delay))
      attempt += 1
    }
  }

  throw lastError || new Error("Unable to fetch exchange rates.")
}

export function useExchangeRate(fiat: FiatCurrency, asset: CryptoAsset) {
  const [state, setState] = useState<ExchangeRateState>({
    data: null,
    isLoading: true,
    error: null,
    warning: null,
    countdown: COUNTDOWN_START,
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateFromCache = useCallback(
    (cached: { timestamp: number; data: any }, reason: string) => {
      if (!cached?.data) return
      const lower = fiat.toLowerCase()
      const usdcPrice = cached.data["usd-coin"]?.[lower]
      const xlmPrice = cached.data.stellar?.[lower]
      if (!usdcPrice || !xlmPrice) return

      const result = buildRateResult(fiat, asset, usdcPrice, xlmPrice, "cache", cached.timestamp)

      setState((prev) => ({
        ...prev,
        data: result,
        isLoading: false,
        warning: reason,
      }))
    },
    [asset, fiat]
  )

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await fetchWithRetry(3)
      const lower = fiat.toLowerCase()
      const usdcPrice = data["usd-coin"]?.[lower]
      const xlmPrice = data.stellar?.[lower]
      if (!usdcPrice || !xlmPrice) {
        throw new Error("Exchange rate unavailable for selected currency.")
      }

      const result = buildRateResult(fiat, asset, usdcPrice, xlmPrice, "coingecko", Date.now())
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: result.lastUpdated, data })
      )

      setState({
        data: result,
        isLoading: false,
        error: null,
        warning: null,
        countdown: COUNTDOWN_START,
      })
    } catch (error) {
      const message = (error as Error).message
      console.error("Exchange rate error:", error)
      const cachedRaw = localStorage.getItem(STORAGE_KEY)
      if (cachedRaw) {
        updateFromCache(JSON.parse(cachedRaw), "Using cached exchange rate.")
      }
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
    }
  }, [asset, fiat, updateFromCache])

  useEffect(() => {
    const cachedRaw = localStorage.getItem(STORAGE_KEY)
    if (cachedRaw) {
      updateFromCache(JSON.parse(cachedRaw), "Using cached exchange rate while refreshing.")
    }
    refresh()
  }, [refresh, updateFromCache])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setState((prev) => {
        const next = prev.countdown - 1
        if (next <= 0) {
          refresh()
          return { ...prev, countdown: COUNTDOWN_START }
        }
        return { ...prev, countdown: next }
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  const displayRate = useMemo(() => {
    if (!state.data) return ""
    return `1 ${state.data.fiat} = ${formatRate(state.data.rate)} ${state.data.asset}`
  }, [state.data])

  return {
    ...state,
    refresh,
    displayRate,
  }
}
