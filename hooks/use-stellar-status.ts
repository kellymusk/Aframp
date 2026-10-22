'use client'

import { useEffect, useState } from 'react'

export type StellarStatus = 'operational' | 'degraded' | 'outage' | 'loading' | 'error'

export interface UseStellarStatusReturn {
  status: StellarStatus
  description: string
}

const MAINNET_STATUS_URL = 'https://status.stellar.org/api/v2/status.json'
const TESTNET_STATUS_URL = 'https://status.testnet.stellar.org/api/v2/status.json'
const POLL_INTERVAL = 60000 // 60 seconds

/**
 * Polls the Stellar status page every 60s to get network health status.
 * Switches to testnet status URL when NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET'.
 */
export function useStellarStatus(): UseStellarStatusReturn {
  const [status, setStatus] = useState<StellarStatus>('loading')
  const [description, setDescription] = useState('Loading network status...')

  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'MAINNET'
  const statusUrl = network === 'TESTNET' ? TESTNET_STATUS_URL : MAINNET_STATUS_URL

  useEffect(() => {
    let cancelled = false

    const fetchStatus = async () => {
      try {
        const response = await fetch(statusUrl)
        if (!response.ok) throw new Error('Failed to fetch status')

        const data = await response.json()
        if (cancelled) return

        const indicator = data.status?.indicator || 'none'
        const desc = data.status?.description || 'Unknown status'

        setDescription(desc)

        // Map Stellar status indicators to our status types
        // none = operational, minor = degraded, major/critical = outage
        if (indicator === 'none') {
          setStatus('operational')
        } else if (indicator === 'minor') {
          setStatus('degraded')
        } else {
          setStatus('outage')
        }
      } catch (error) {
        if (cancelled) return
        console.error('[stellar-status] Failed to fetch status:', error)
        setStatus('error')
        setDescription('Unable to fetch network status')
      }
    }

    // Initial fetch
    fetchStatus()

    // Set up polling
    const interval = setInterval(fetchStatus, POLL_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { status, description }
}
