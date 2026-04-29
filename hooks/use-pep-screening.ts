'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PepScreeningResult } from '@/lib/pep/types'

export interface UsePepScreeningReturn {
  result: PepScreeningResult | null
  loading: boolean
  error: string | null
  screen: (walletAddress: string, fullName: string) => Promise<PepScreeningResult | null>
}

export function usePepScreening(walletAddress?: string): UsePepScreeningReturn {
  const [result, setResult] = useState<PepScreeningResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing screening results on mount
  useEffect(() => {
    if (!walletAddress) return
    setLoading(true)
    fetch(`/api/pep/screen?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data: PepScreeningResult[]) => {
        if (data.length > 0) setResult(data[data.length - 1]) // latest
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [walletAddress])

  const screen = useCallback(async (wallet: string, fullName: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pep/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet, fullName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Screening failed')
      setResult(data)
      return data as PepScreeningResult
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, loading, error, screen }
}
