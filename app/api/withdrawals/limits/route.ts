/**
 * GET /api/withdrawals/limits
 *
 * Returns the current user's KYC tier, daily limit, used amount, remaining
 * allowance, and reset time.  No withdrawal is triggered.
 *
 * Query parameters:
 *   userId  — wallet public key
 *   kycTier — "TIER_0" | "TIER_1" | "TIER_2" | "TIER_3"
 *
 * Success 200:
 *   {
 *     kycTier:    string,
 *     dailyLimit: number | null,   // cents; null = unlimited
 *     used:       number,          // cents used in current window
 *     remaining:  number | null,   // cents remaining; null = unlimited
 *     resetAt:    string | null,   // ISO 8601; null if no transactions in window
 *   }
 *
 * Error 400: missing or invalid query params
 */

import { NextRequest, NextResponse } from 'next/server'
import { isKycTier, KYC_TIERS } from '@/lib/kyc/tiers'
import { getRollingTotal, getRemainingLimit, getOldestInWindowDate } from '@/lib/kyc/withdrawalLimitService'

const WINDOW_MS = 86_400_000 // 24 hours

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const userId = searchParams.get('userId')
  const kycTierParam = searchParams.get('kycTier')

  if (!userId || !userId.trim()) {
    return NextResponse.json({ error: 'Missing required query param: userId' }, { status: 400 })
  }

  if (!kycTierParam || !isKycTier(kycTierParam)) {
    return NextResponse.json(
      { error: 'Missing or invalid query param: kycTier', validValues: ['TIER_0', 'TIER_1', 'TIER_2', 'TIER_3'] },
      { status: 400 }
    )
  }

  const kycTier = kycTierParam
  const { dailyLimit } = KYC_TIERS[kycTier]
  const used = getRollingTotal(userId, WINDOW_MS)
  const remaining = getRemainingLimit(userId, kycTier, WINDOW_MS)
  const oldest = getOldestInWindowDate(userId, WINDOW_MS)
  const resetAt = oldest ? new Date(oldest.getTime() + WINDOW_MS).toISOString() : null

  return NextResponse.json({
    kycTier,
    dailyLimit,
    used,
    remaining,
    resetAt,
  })
}
