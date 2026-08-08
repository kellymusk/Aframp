'use client'

import { useState, useEffect, useCallback } from 'react'
import { recordDataUpdate } from '@/lib/offline/connectivity'

export function useEthPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEthPrice = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/rates')

      if (!response.ok) {
        throw new Error(`Failed to fetch ETH price: ${response.statusText}`)
      }

      const data = (await response.json()) as { ethereum?: { usd?: number }; error?: string }

      if (data.error) throw new Error(data.error)

      const ethPrice = data.ethereum?.usd
      if (!ethPrice || isNaN(ethPrice)) {
        throw new Error('Invalid rate response: ETH price not found')
      }

      setPrice(ethPrice)
      const updatedAt = new Date()
      setLastUpdated(updatedAt)
      recordDataUpdate(updatedAt.getTime())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ETH price')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 60_000)
    return () => clearInterval(interval)
  }, [fetchEthPrice])

  return { price, loading, error, lastUpdated, refetch: fetchEthPrice }
}
