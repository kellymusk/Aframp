/**
 * GET /api/referral/stats?wallet=G...
 *
 * Returns persistent referral statistics for the given wallet address.
 *
 * Response shape:
 * {
 *   code:               string   — the wallet's referral code
 *   ownerAddress:       string   — wallet address
 *   clickCount:         number   — total link clicks
 *   conversionCount:    number   — completed conversions
 *   pendingCount:       number   — referees who signed up but haven't ramped
 *   totalRebatesEarned: number   — total fee rebates earned (NGN equivalent)
 * }
 *
 * Stats are backed by Upstash Redis and survive serverless cold starts.
 * Falls back to the in-memory analytics store when Redis is not configured
 * (e.g. local development without a Redis instance).
 */

import { NextResponse } from 'next/server'
import { generateReferralCode } from '@/lib/referral'
import { getStats } from '@/lib/referral/stats-store'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')

  if (!wallet) {
    return NextResponse.json({ error: 'wallet query parameter required' }, { status: 400 })
  }

  const code = generateReferralCode(wallet)

  try {
    const stats = await getStats(code, wallet)
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[/api/referral/stats] Failed to fetch stats:', err)
    // Return zeros so the UI still renders instead of crashing
    return NextResponse.json({
      code,
      ownerAddress: wallet,
      clickCount: 0,
      conversionCount: 0,
      pendingCount: 0,
      totalRebatesEarned: 0,
    })
  }
}
