/**
 * Persistent referral statistics store backed by Upstash Redis.
 *
 * Stats are stored as a Redis hash keyed by referral code:
 *   Key schema:  referral:stats:<code>
 *   Fields:      ownerAddress, clickCount, conversionCount, totalRebatesEarned
 *
 * Falls back to the in-memory analytics store when Redis env vars are not
 * configured, so the app still works in local dev without a Redis instance.
 *
 * Required env vars (already used by the rate-limiter in middleware.ts):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from '@upstash/redis'
import { getStatsByCode, type ReferralAnalyticsRecord } from './analytics'

// ── Redis client ─────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// ── Key helpers ──────────────────────────────────────────────────────────────

function statsKey(code: string) {
  return `referral:stats:${code}`
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReferralStatsRecord {
  code: string
  ownerAddress: string
  /** Total number of link clicks */
  clickCount: number
  /** Total number of completed conversions (pending + converted) */
  conversionCount: number
  /** Number of referees who signed up but have not yet completed their first ramp */
  pendingCount: number
  /** Sum of fee rebates earned by the referrer (NGN equivalent) */
  totalRebatesEarned: number
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Retrieve persistent stats for a referral code.
 * Returns null if no stats exist yet for this code.
 */
export async function getStats(code: string, ownerAddress: string): Promise<ReferralStatsRecord> {
  const redis = getRedis()

  if (redis) {
    const raw = await redis.hgetall<Record<string, string>>(statsKey(code))

    if (raw && Object.keys(raw).length > 0) {
      return {
        code,
        ownerAddress: raw.ownerAddress ?? ownerAddress,
        clickCount: Number(raw.clickCount ?? 0),
        conversionCount: Number(raw.conversionCount ?? 0),
        pendingCount: Number(raw.pendingCount ?? 0),
        totalRebatesEarned: Number(raw.totalRebatesEarned ?? 0),
      }
    }

    // No data yet — seed an empty record and return zeros
    await redis.hset(statsKey(code), {
      ownerAddress,
      clickCount: 0,
      conversionCount: 0,
      pendingCount: 0,
      totalRebatesEarned: 0,
    })

    return {
      code,
      ownerAddress,
      clickCount: 0,
      conversionCount: 0,
      pendingCount: 0,
      totalRebatesEarned: 0,
    }
  }

  // ── Fallback: in-memory analytics store ─────────────────────────────────
  const mem: ReferralAnalyticsRecord | null = getStatsByCode(code)
  return {
    code,
    ownerAddress,
    clickCount: mem?.clickCount ?? 0,
    conversionCount: mem?.conversionCount ?? 0,
    pendingCount: 0,
    totalRebatesEarned: mem?.totalRebatesEarned ?? 0,
  }
}

/**
 * Atomically increment the click counter for a referral code.
 */
export async function incrementClick(code: string, ownerAddress: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const key = statsKey(code)
  // Ensure the hash exists before incrementing
  await redis.hsetnx(key, 'ownerAddress', ownerAddress)
  await redis.hincrby(key, 'clickCount', 1)
}

/**
 * Record a new referee (they signed up but haven't ramped yet → pending).
 */
export async function incrementPending(code: string, ownerAddress: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const key = statsKey(code)
  await redis.hsetnx(key, 'ownerAddress', ownerAddress)
  await redis.hincrby(key, 'pendingCount', 1)
}

/**
 * Convert a pending referral to a completed conversion and credit the rebate.
 *
 * @param code           Referral code
 * @param ownerAddress   Referrer's wallet address
 * @param rebateAmount   Fee rebate earned (NGN equivalent)
 */
export async function recordConversion(
  code: string,
  ownerAddress: string,
  rebateAmount: number,
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const key = statsKey(code)
  await redis.hsetnx(key, 'ownerAddress', ownerAddress)

  // Move one from pending to converted
  const pending = Number((await redis.hget<string>(key, 'pendingCount')) ?? '0')
  if (pending > 0) {
    await redis.hincrby(key, 'pendingCount', -1)
  }

  await redis.hincrby(key, 'conversionCount', 1)

  // HINCRBYFLOAT for the float rebate amount
  await redis.hincrbyfloat(key, 'totalRebatesEarned', rebateAmount)
}
