'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import type { KycStatus } from '@/types/kyc'

const CACHE_KEY = 'aframp.kyc-status'

interface KycStatusState {
  status: KycStatus | 'unsubmitted' | null
  loading: boolean
  error: string | null
}

function readCache(): KycStatus | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as KycStatus) : null
  } catch {
    return null
  }
}

function writeCache(status: KycStatus) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(status))
  } catch {
    // Best-effort only — a missed cache write just means the gate re-checks the API next time.
  }
}

/**
 * Verified users skip the KYC prompt on every subsequent purchase — this
 * reads from cache first and only trusts a fresh `approved` off the wire to
 * avoid re-showing the flow to someone already cleared.
 */
export function useKycStatus(token: string): KycStatusState {
  const [state, setState] = useState<KycStatusState>(() => {
    const cached = readCache()
    return cached === 'approved'
      ? { status: 'approved', loading: false, error: null }
      : { status: null, loading: true, error: null }
  })

  useEffect(() => {
    if (state.status === 'approved') return

    const controller = new AbortController()
    api
      .getKycStatus(token, controller.signal)
      .then((response) => {
        setState({ status: response.status, loading: false, error: null })
        if (response.status === 'approved') writeCache('approved')
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        // A 404 means the user has never started a submission — that's not an error state.
        if (cause instanceof ApiError && cause.status === 404) {
          setState({ status: 'unsubmitted', loading: false, error: null })
          return
        }
        setState({
          status: null,
          loading: false,
          error: cause instanceof Error ? cause.message : 'Could not check KYC status',
        })
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-runs only when token or cached status changes
  }, [token])

  return state
}
