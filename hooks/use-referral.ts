'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  generateReferralCode,
  getAppliedReferralCode,
  setAppliedReferralCode,
  REFERRAL_DISCOUNT_PCT,
  type ReferralRecord,
} from '@/lib/referral'

export interface ReferralStats {
  code: string
  ownerAddress: string
  clickCount: number
  conversionCount: number
  /** Referees who signed up but haven't completed their first ramp yet */
  pendingCount: number
  totalRebatesEarned: number
}

export interface UseReferralReturn {
  /** This user's own referral code */
  myCode: string
  /** Stats for the referrer (referees count, rebates earned) */
  record: ReferralRecord | null
  /** Analytics stats (clicks, conversions) */
  stats: ReferralStats | null
  /** Code the current user applied (for their own discount) */
  appliedCode: string | null
  /** Whether this wallet has already consumed its one-time discount (server-verified) */
  discountConsumed: boolean
  /** Whether the 10% first-ramp discount is active */
  discountActive: boolean
  /** Apply a referral code — returns error string or null on success */
  applyCode: (code: string) => Promise<string | null>
  /** Atomically consume the discount server-side — returns error string or null on success */
  consumeDiscount: () => Promise<string | null>
  loading: boolean
}

export function useReferral(walletAddress: string): UseReferralReturn {
  const myCode = walletAddress ? generateReferralCode(walletAddress) : ''
  const [record, setRecord] = useState<ReferralRecord | null>(null)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [discountConsumed, setDiscountConsumed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load applied code + fetch referrer stats + analytics + server-verified consumption state
  useEffect(() => {
    if (!walletAddress) return
    setAppliedCode(getAppliedReferralCode())

    setLoading(true)
    Promise.all([
      fetch(`/api/referral?wallet=${encodeURIComponent(walletAddress)}`).then((r) => r.json()),
      fetch(`/api/referral/stats?wallet=${encodeURIComponent(walletAddress)}`).then((r) => r.json()),
      fetch(`/api/referral/consume?wallet=${encodeURIComponent(walletAddress)}`).then((r) => r.json()),
    ])
      .then(([recordData, statsData, consumeData]) => {
        setRecord(recordData)
        setStats(statsData)
        setDiscountConsumed(!!consumeData?.consumed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [walletAddress])

  const applyCode = useCallback(
    async (code: string): Promise<string | null> => {
      if (!walletAddress) return 'Connect your wallet first'
      if (!code.trim()) return 'Enter a referral code'
      if (discountConsumed) return 'You have already used a referral code'

      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), refereeWallet: walletAddress }),
      })
      const data = await res.json()
      if (!res.ok) return data.error ?? 'Invalid code'

      setAppliedReferralCode(code.trim().toUpperCase())
      setAppliedCode(code.trim().toUpperCase())
      return null
    },
    [walletAddress, discountConsumed]
  )

  const consumeDiscount = useCallback(async (): Promise<string | null> => {
    if (!walletAddress) return 'Connect your wallet first'

    const res = await fetch('/api/referral/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletAddress }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDiscountConsumed(true)
      return data.error ?? 'Referral discount already used'
    }

    setDiscountConsumed(true)
    return null
  }, [walletAddress])

  const discountActive = !!appliedCode && !discountConsumed

  return {
    myCode,
    record,
    stats,
    appliedCode,
    discountConsumed,
    discountActive,
    applyCode,
    consumeDiscount,
    loading,
  }
}

export { REFERRAL_DISCOUNT_PCT }
