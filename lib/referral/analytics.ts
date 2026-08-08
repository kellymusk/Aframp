import { REFERRAL_REWARD_PCT } from './index'

/**
 * In-memory analytics store for referral program metrics.
 * In production, replace with the `referral_analytics` and
 * `referral_conversions` tables (see db/migrations/002_referral_analytics.sql).
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface ReferralClickEvent {
  code: string
  timestamp: number
}

export interface ReferralConversionEvent {
  code: string
  ownerAddress: string
  refereeWallet: string
  discountAmount: number
  rebateAmount: number
  orderId: string
  timestamp: number
}

export interface ReferralAnalyticsRecord {
  code: string
  ownerAddress: string
  clickCount: number
  conversionCount: number
  totalRebatesEarned: number
  recentClicks: ReferralClickEvent[]
  recentConversions: ReferralConversionEvent[]
}

// ── In-memory store ─────────────────────────────────────────────────────────

const store = new Map<string, ReferralAnalyticsRecord>()

function getOrCreate(code: string, ownerAddress: string): ReferralAnalyticsRecord {
  if (!store.has(code)) {
    store.set(code, {
      code,
      ownerAddress,
      clickCount: 0,
      conversionCount: 0,
      totalRebatesEarned: 0,
      recentClicks: [],
      recentConversions: [],
    })
  }
  return store.get(code)!
}

// ── Public API ──────────────────────────────────────────────────────────────

export function trackClick(code: string): void {
  const record = getOrCreate(code, 'unknown')
  record.clickCount++
  record.recentClicks.push({ code, timestamp: Date.now() })
}

export function trackConversion(
  code: string,
  refereeWallet: string,
  orderId: string,
  totalFees?: number,
): void {
  const record = getOrCreate(code, 'unknown')

  const discountAmount = totalFees ? totalFees * (10 / 100) : 0
  const rebateAmount = totalFees ? totalFees * (REFERRAL_REWARD_PCT / 100) : 0

  record.conversionCount++
  record.totalRebatesEarned += rebateAmount
  record.recentConversions.push({
    code,
    ownerAddress: 'unknown',
    refereeWallet,
    discountAmount,
    rebateAmount,
    orderId,
    timestamp: Date.now(),
  })
}

export function getStatsByCode(code: string): ReferralAnalyticsRecord | null {
  return store.get(code) ?? null
}
