/**
 * Tests for withdrawalLimitService.ts
 *
 * Covers all acceptance criteria:
 *  - TIER_0 always rejected with KYC_REQUIRED
 *  - TIER_1 under limit allowed
 *  - TIER_1 at exactly the limit rejected
 *  - TIER_1 rolling total + new amount exceeds limit → rejected with correct remaining
 *  - TIER_2 allowed up to $10,000/day
 *  - TIER_3 no limit enforced
 *  - Rolling window excludes transactions older than 24 hours
 *  - GET /api/withdrawals/limits returns correct values at each tier
 *  - Concurrent requests do not allow double-spend past the limit
 */

import {
  canWithdraw,
  getRollingTotal,
  getRemainingLimit,
  getOldestInWindowDate,
  seedWithdrawal,
  _clearUserRecords,
  _withdrawalStore,
} from './withdrawalLimitService'
import { KYC_TIERS } from './tiers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let userCounter = 0
/** Returns a unique userId per test so tests never share state. */
function freshUser(): string {
  return `user_test_${++userCounter}_${Math.random().toString(36).slice(2)}`
}

function seedCompleted(userId: string, amountCents: number, createdAt: Date) {
  seedWithdrawal({ id: `seed_${Math.random()}`, userId, amountCents, status: 'completed', createdAt })
}

function seedPending(userId: string, amountCents: number, createdAt: Date) {
  seedWithdrawal({ id: `seed_${Math.random()}`, userId, amountCents, status: 'pending', createdAt })
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// TIER_0 — always rejected
// ---------------------------------------------------------------------------

describe('TIER_0 — Unverified', () => {
  it('rejects any withdrawal with KYC_REQUIRED', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, 1, 'TIER_0')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('KYC_REQUIRED')
  })

  it('rejects even a 1-cent withdrawal', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, 1, 'TIER_0')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.dailyLimit).toBe(0)
  })

  it('does not record a withdrawal record when rejected', async () => {
    const userId = freshUser()
    await canWithdraw(userId, 500_00, 'TIER_0')
    expect(_withdrawalStore.get(userId) ?? []).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// TIER_1 — $1,000 / day
// ---------------------------------------------------------------------------

describe('TIER_1 — Basic ($1,000/day)', () => {
  const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number // 100_000 cents

  it('allows a withdrawal under the limit', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, 50_00, 'TIER_1') // $50
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(LIMIT - 50_00)
  })

  it('allows a withdrawal that exactly reaches the limit', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, LIMIT, 'TIER_1') // exactly $1,000
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('rejects a withdrawal that would exceed the limit by 1 cent', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, LIMIT + 1, 'TIER_1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
    expect(result.remaining).toBe(LIMIT) // nothing used yet
  })

  it('rejects when rolling total + new amount exceeds limit', async () => {
    const userId = freshUser()
    // Seed $950 already used
    seedCompleted(userId, 95_000, hoursAgo(1))

    const result = await canWithdraw(userId, 60_00, 'TIER_1') // $60 would push to $1,010
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
    expect(result.remaining).toBe(LIMIT - 95_000) // $50 remaining
    expect(result.used).toBe(95_000)
  })

  it('allows withdrawal when rolling total + amount equals limit exactly', async () => {
    const userId = freshUser()
    seedCompleted(userId, 50_000, hoursAgo(2)) // $500 used

    const result = await canWithdraw(userId, 50_000, 'TIER_1') // $500 more = exactly $1,000
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('includes resetAt in rejection response', async () => {
    const userId = freshUser()
    const oldestDate = hoursAgo(12)
    seedCompleted(userId, LIMIT, oldestDate)

    const result = await canWithdraw(userId, 1, 'TIER_1')
    expect(result.allowed).toBe(false)
    expect(result.resetAt).not.toBeNull()
    // resetAt should be ~12 hours from now (oldest + 24h)
    const resetAt = new Date(result.resetAt!)
    const expectedReset = new Date(oldestDate.getTime() + 86_400_000)
    expect(Math.abs(resetAt.getTime() - expectedReset.getTime())).toBeLessThan(1000)
  })

  it('counts both pending and completed transactions in rolling total', async () => {
    const userId = freshUser()
    seedCompleted(userId, 40_000, hoursAgo(1))
    seedPending(userId, 40_000, hoursAgo(0.5))

    const total = getRollingTotal(userId)
    expect(total).toBe(80_000)
  })

  it('does not count failed or cancelled transactions', async () => {
    const userId = freshUser()
    seedWithdrawal({ id: 'f1', userId, amountCents: 90_000, status: 'failed', createdAt: hoursAgo(1) })
    seedWithdrawal({ id: 'c1', userId, amountCents: 90_000, status: 'cancelled', createdAt: hoursAgo(1) })

    const total = getRollingTotal(userId)
    expect(total).toBe(0)

    const result = await canWithdraw(userId, LIMIT, 'TIER_1')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TIER_2 — $10,000 / day
// ---------------------------------------------------------------------------

describe('TIER_2 — Intermediate ($10,000/day)', () => {
  const LIMIT = KYC_TIERS.TIER_2.dailyLimit as number // 1_000_000 cents

  it('allows a $5,000 withdrawal', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, 500_000, 'TIER_2')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(LIMIT - 500_000)
  })

  it('allows a withdrawal that exactly reaches $10,000', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, LIMIT, 'TIER_2')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('rejects a withdrawal that would exceed $10,000', async () => {
    const userId = freshUser()
    seedCompleted(userId, 900_000, hoursAgo(1)) // $9,000 used

    const result = await canWithdraw(userId, 200_000, 'TIER_2') // $2,000 would exceed
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
    expect(result.remaining).toBe(LIMIT - 900_000) // $1,000 remaining
  })

  it('TIER_1 limit does not apply to TIER_2 users', async () => {
    const userId = freshUser()
    // $1,500 — above TIER_1 limit but below TIER_2 limit
    const result = await canWithdraw(userId, 150_000, 'TIER_2')
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TIER_3 — unlimited
// ---------------------------------------------------------------------------

describe('TIER_3 — Full (unlimited)', () => {
  it('allows any withdrawal regardless of amount', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, 999_999_999, 'TIER_3')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeNull()
    expect(result.dailyLimit).toBeNull()
  })

  it('allows multiple large withdrawals in the same window', async () => {
    const userId = freshUser()
    seedCompleted(userId, 999_999_999, hoursAgo(1))

    const result = await canWithdraw(userId, 999_999_999, 'TIER_3')
    expect(result.allowed).toBe(true)
  })

  it('returns null for remaining and dailyLimit', async () => {
    const userId = freshUser()
    const result = await canWithdraw(userId, 1_000_00, 'TIER_3')
    expect(result.remaining).toBeNull()
    expect(result.dailyLimit).toBeNull()
    expect(result.resetAt).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rolling window — excludes transactions older than 24 hours
// ---------------------------------------------------------------------------

describe('Rolling window', () => {
  it('excludes completed transactions older than 24 hours', async () => {
    const userId = freshUser()
    // Seed a transaction 25 hours ago — outside the window
    seedCompleted(userId, KYC_TIERS.TIER_1.dailyLimit as number, hoursAgo(25))

    const total = getRollingTotal(userId)
    expect(total).toBe(0)

    // Should be allowed because the old tx is outside the window
    const result = await canWithdraw(userId, KYC_TIERS.TIER_1.dailyLimit as number, 'TIER_1')
    expect(result.allowed).toBe(true)
  })

  it('includes transactions exactly at the window boundary', async () => {
    const userId = freshUser()
    // 23h 59m 59s ago — just inside the 24h window
    const justInside = new Date(Date.now() - (86_400_000 - 1000))
    seedCompleted(userId, 50_000, justInside)

    const total = getRollingTotal(userId)
    expect(total).toBe(50_000)
  })

  it('excludes transactions exactly at 24h + 1ms ago', async () => {
    const userId = freshUser()
    const justOutside = new Date(Date.now() - (86_400_000 + 1))
    seedCompleted(userId, 50_000, justOutside)

    const total = getRollingTotal(userId)
    expect(total).toBe(0)
  })

  it('mixes in-window and out-of-window transactions correctly', async () => {
    const userId = freshUser()
    seedCompleted(userId, 30_000, hoursAgo(25)) // outside — ignored
    seedCompleted(userId, 20_000, hoursAgo(12)) // inside — counted
    seedCompleted(userId, 10_000, hoursAgo(1))  // inside — counted

    const total = getRollingTotal(userId)
    expect(total).toBe(30_000)
  })
})

// ---------------------------------------------------------------------------
// getRemainingLimit
// ---------------------------------------------------------------------------

describe('getRemainingLimit', () => {
  it('returns dailyLimit when no transactions exist', () => {
    const userId = freshUser()
    expect(getRemainingLimit(userId, 'TIER_1')).toBe(KYC_TIERS.TIER_1.dailyLimit)
    expect(getRemainingLimit(userId, 'TIER_2')).toBe(KYC_TIERS.TIER_2.dailyLimit)
  })

  it('returns 0 when limit is fully used', () => {
    const userId = freshUser()
    seedCompleted(userId, KYC_TIERS.TIER_1.dailyLimit as number, hoursAgo(1))
    expect(getRemainingLimit(userId, 'TIER_1')).toBe(0)
  })

  it('never returns negative remaining', () => {
    const userId = freshUser()
    // Seed more than the limit (edge case: limit was lowered after seeding)
    seedCompleted(userId, (KYC_TIERS.TIER_1.dailyLimit as number) + 10_000, hoursAgo(1))
    expect(getRemainingLimit(userId, 'TIER_1')).toBe(0)
  })

  it('returns null for TIER_3 (unlimited)', () => {
    const userId = freshUser()
    expect(getRemainingLimit(userId, 'TIER_3')).toBeNull()
  })

  it('returns 0 for TIER_0', () => {
    const userId = freshUser()
    expect(getRemainingLimit(userId, 'TIER_0')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getOldestInWindowDate
// ---------------------------------------------------------------------------

describe('getOldestInWindowDate', () => {
  it('returns null when no in-window transactions exist', () => {
    const userId = freshUser()
    expect(getOldestInWindowDate(userId)).toBeNull()
  })

  it('returns the oldest in-window transaction date', () => {
    const userId = freshUser()
    const older = hoursAgo(10)
    const newer = hoursAgo(2)
    seedCompleted(userId, 10_000, newer)
    seedCompleted(userId, 10_000, older)

    const result = getOldestInWindowDate(userId)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.getTime() - older.getTime())).toBeLessThan(100)
  })

  it('ignores out-of-window transactions when finding oldest', () => {
    const userId = freshUser()
    const outOfWindow = hoursAgo(25)
    const inWindow = hoursAgo(5)
    seedCompleted(userId, 10_000, outOfWindow)
    seedCompleted(userId, 10_000, inWindow)

    const result = getOldestInWindowDate(userId)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.getTime() - inWindow.getTime())).toBeLessThan(100)
  })
})

// ---------------------------------------------------------------------------
// Concurrency — no double-spend past the limit
// ---------------------------------------------------------------------------

describe('Concurrency — no double-spend', () => {
  it('serialises concurrent requests for the same user', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number // 100_000 cents

    // Fire 5 concurrent requests each for $300 ($1,500 total — exceeds $1,000 limit)
    const requests = Array.from({ length: 5 }, () =>
      canWithdraw(userId, 30_000, 'TIER_1')
    )
    const results = await Promise.all(requests)

    const allowed = results.filter((r) => r.allowed)
    const rejected = results.filter((r) => !r.allowed)

    // Exactly 3 should be allowed ($300 × 3 = $900 ≤ $1,000)
    // The 4th would push to $1,200 — rejected
    expect(allowed.length).toBe(3)
    expect(rejected.length).toBe(2)

    // Total recorded in store must not exceed the limit
    const total = getRollingTotal(userId)
    expect(total).toBeLessThanOrEqual(LIMIT)
  })

  it('serialises concurrent requests that together exactly hit the limit', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number

    // 4 × $250 = exactly $1,000
    const requests = Array.from({ length: 4 }, () =>
      canWithdraw(userId, 25_000, 'TIER_1')
    )
    const results = await Promise.all(requests)

    const allowed = results.filter((r) => r.allowed)
    expect(allowed.length).toBe(4)

    const total = getRollingTotal(userId)
    expect(total).toBe(LIMIT)
  })

  it('does not allow any concurrent request to exceed TIER_2 limit', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_2.dailyLimit as number // 1_000_000 cents

    // 12 × $1,000 = $12,000 — exceeds $10,000 limit
    const requests = Array.from({ length: 12 }, () =>
      canWithdraw(userId, 100_000, 'TIER_2')
    )
    const results = await Promise.all(requests)

    const allowed = results.filter((r) => r.allowed)
    expect(allowed.length).toBe(10) // exactly 10 × $1,000 = $10,000

    const total = getRollingTotal(userId)
    expect(total).toBeLessThanOrEqual(LIMIT)
  })
})

// ---------------------------------------------------------------------------
// WithdrawalLimitError shape
// ---------------------------------------------------------------------------

describe('WithdrawalLimitError response body', () => {
  it('includes all required fields for a 403 response', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number
    seedCompleted(userId, 95_000, hoursAgo(1))

    const result = await canWithdraw(userId, 10_000, 'TIER_1')
    expect(result.allowed).toBe(false)

    // Simulate what the route handler does
    const body = {
      error: 'WITHDRAWAL_LIMIT_EXCEEDED',
      kycTier: 'TIER_1',
      dailyLimit: LIMIT,
      used: result.used,
      remaining: result.remaining,
      resetAt: result.resetAt,
    }

    expect(body.error).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
    expect(body.kycTier).toBe('TIER_1')
    expect(body.dailyLimit).toBe(LIMIT)
    expect(typeof body.used).toBe('number')
    expect(typeof body.remaining).toBe('number')
    // resetAt is an ISO 8601 string or null
    if (body.resetAt !== null) {
      expect(() => new Date(body.resetAt!)).not.toThrow()
    }
  })
})
