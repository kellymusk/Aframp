/**
 * Referral program core logic.
 *
 * Storage: localStorage (client, for non-sensitive UI state like the applied
 * code) + server-side store for discount consumption (see lib/referral/store.ts
 * and /api/referral/consume) — consumption must live server-side since it
 * gates a real financial discount and can't be trusted from the client.
 */

export const REFERRAL_DISCOUNT_PCT = 10 // 10% off first ramp fees
export const REFERRAL_REWARD_PCT = 5   // 5% fee rebate for referrer on referee's first ramp

/** Generate a unique referral code from a wallet address */
export function generateReferralCode(walletAddress: string): string {
  // Deterministic: first 4 chars of address + 4-char hash suffix
  const prefix = walletAddress.slice(1, 5).toUpperCase()
  let hash = 0
  for (let i = 0; i < walletAddress.length; i++) {
    hash = (hash * 31 + walletAddress.charCodeAt(i)) >>> 0
  }
  const suffix = (hash % 10000).toString().padStart(4, '0')
  return `AFR-${prefix}-${suffix}`
}

export interface ReferralRecord {
  code: string
  ownerAddress: string
  referees: string[]       // wallet addresses who used this code
  totalRebatesEarned: number // in fiat (NGN equivalent)
  createdAt: number
}

export interface ReferralReward {
  discountPct: number
  isFirstRamp: boolean
  discountAmount: number
}

/** Calculate the discount for a referee on their first ramp */
export function calcReferralDiscount(totalFees: number): ReferralReward {
  const discountAmount = totalFees * (REFERRAL_DISCOUNT_PCT / 100)
  return {
    discountPct: REFERRAL_DISCOUNT_PCT,
    isFirstRamp: true,
    discountAmount,
  }
}

// ── localStorage helpers (client-side) ──────────────────────────────────────
// Non-sensitive UI state only. Discount consumption is tracked server-side —
// see the `useReferral` hook and /api/referral/consume.

const LS_APPLIED_KEY = 'referral:applied'   // code the current user applied

export function getAppliedReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LS_APPLIED_KEY)
}

export function setAppliedReferralCode(code: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_APPLIED_KEY, code)
}
