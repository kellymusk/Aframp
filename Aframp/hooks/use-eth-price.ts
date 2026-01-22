"use client"

import { useState, useEffect, useCallback } from "react"

interface EthSymbol {
  symbol: string
  last: string | number
  last_btc?: string | number
  lowest?: string | number
  highest?: string | number
  date?: string
  daily_change_percentage?: string | number
  source_exchange?: string
}

interface EthPriceResponse {
  status: string
  symbols: EthSymbol[]
}

export function useEthPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEthPrice = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("https://kelly-musk.up.railway.app/api/eth-price", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add cache control to prevent stale data
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ETH price: ${response.statusText}`)
      }

      const data: EthPriceResponse = await response.json()
      
      // Filter and extract price from JSON response
      // The API returns: { status: "success", symbols: [{ symbol: "ETH", last: "3204.27", ... }] }
      let ethPrice: number | null = null
      
      if (data.status === "success" && data.symbols && Array.isArray(data.symbols) && data.symbols.length > 0) {
        const ethSymbol = data.symbols.find((s) => s.symbol === "ETH") || data.symbols[0]
        
        if (ethSymbol && ethSymbol.last !== undefined) {
          // Convert to number if it's a string
          ethPrice = typeof ethSymbol.last === "string" ? parseFloat(ethSymbol.last) : ethSymbol.last
        }
      }

      if (ethPrice === null || isNaN(ethPrice)) {
        throw new Error("Invalid API response format: price not found")
      }

      setPrice(ethPrice)
      setLastUpdated(new Date())
      setLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch ETH price"
      setError(errorMessage)
      setLoading(false)
      console.error("Error fetching ETH price:", err)
    }
  }, [])

  useEffect(() => {
    // Fetch immediately on mount
    fetchEthPrice()

    // Set up interval to fetch every minute (60000ms)
    const interval = setInterval(() => {
      fetchEthPrice()
    }, 60000) // 60 seconds = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [fetchEthPrice])

  return {
    price,
    loading,
    error,
    lastUpdated,
    refetch: fetchEthPrice,
  }
}

