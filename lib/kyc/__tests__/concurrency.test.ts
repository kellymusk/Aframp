/**
 * Additional concurrency tests for withdrawalLimitService.ts
 *
 * These tests extend the 'Concurrency — no double-spend' describe block in
 * withdrawalLimitService.test.ts and cover scenarios not addressed there:
 *
 *  1. Race condition with pre-existing usage
 *  2. Cross-user isolation (locks are per-user, not global)
 *  3. TIER_3 unlimited — all concurrent requests are always allowed
 *  4. Mixed-tier sequence — same userId across sequential tier changes
 *  5. High concurrency stress test — 50 × $20 = exactly $1,000
 *  6. TIER_0 rejection — no deadlock, all return KYC_REQUIRED immediately
 *  7. Lock release after limit exceeded — subsequent batch is fully rejected
 *  8. Store consistency — getRollingTotal() equals sum of all approved amounts
 */

import {
  canWithdraw,
  getRollingTotal,
  seedWithdrawal,
  _withdrawalStore,
} from '@/lib/kyc/withdrawalLimitService'
import { KYC_TIERS } from '@/lib/kyc/tiers'

// ---------------------------------------------------------------------------
// Helpers  (mirror the pattern used in withdrawalLimitService.test.ts)
// ---------------------------------------------------------------------------

let userCounter = 0

/** Returns a unique userId per call so no two tests share state. */
function freshUser(): string {
  return `concurrency_test_${++userCounter}_${Math.random().toString(36).slice(2)}`
}

/** Seeds a 'completed' withdrawal directly into the in-memory store. */
function seedCompleted(userId: string, amountCents: number, createdAt: Date): void {
  seedWithdrawal({
    id: `seed_${Math.random().toString(36).slice(2)}`,
    userId,
    amountCents,
    status: 'completed',
    createdAt,
  })
}

/** Returns a Date that is `h` hours in the past. */
function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// 1. Race condition with pre-existing usage
// ---------------------------------------------------------------------------

describe('Concurrency — race condition with pre-existing usage', () => {
  it('respects already-used balance: only 2 of 5 concurrent $100 requests pass when $800 already used', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number // 100_000 cents = $1,000

    // Pre-seed $800 of usage in the rolling window
    seedCompleted(userId, 80_000, hoursAgo(1))

    // Remaining is $200 → only 2 × $100 should be allowed
    const requests = Array.from({ length: 5 }, () =>
      canWithdraw(userId, 10_000, 'TIER_1') // $100 each
    )
    const results = await Promise.all(requests)

    const allowed = results.filter((r) => r.allowed)
    const rejected = results.filter((r) => !r.allowed)

    expect(allowed.length).toBe(2)
    expect(rejected.length).toBe(3)
    rejected.forEach((r) => {
      expect(r.reason).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
    })

    // Total in store (seeded + approved) must not exceed the limit
    const total = getRollingTotal(userId)
    expect(total).toBeLessThanOrEqual(LIMIT)
    // Seeded $800 + 2 × $100 = exactly $1,000
    expect(total).toBe(100_000)
  })
})

// ---------------------------------------------------------------------------
// 2. Cross-user isolation
// ---------------------------------------------------------------------------

describe('Concurrency — cross-user isolation', () => {
  it('concurrent requests for different users do not interfere with each other', async () => {
    const userA = freshUser()
    const userB = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number // 100_000 cents

    // Each user fires 5 × $300 concurrently at the same time
    const requestsA = Array.from({ length: 5 }, () =>
      canWithdraw(userA, 30_000, 'TIER_1')
    )
    const requestsB = Array.from({ length: 5 }, () =>
      canWithdraw(userB, 30_000, 'TIER_1')
    )

    // Interleave — submit all 10 simultaneously
    const [resultsA, resultsB] = await Promise.all([
      Promise.all(requestsA),
      Promise.all(requestsB),
    ])

    // Each user gets exactly 3 allowed (3 × $300 = $900 ≤ $1,000; 4th would exceed)
    const allowedA = resultsA.filter((r) => r.allowed)
    const allowedB = resultsB.filter((r) => r.allowed)
    expect(allowedA.length).toBe(3)
    expect(allowedB.length).toBe(3)

    // Neither user's store exceeds their individual limit
    expect(getRollingTotal(userA)).toBeLessThanOrEqual(LIMIT)
    expect(getRollingTotal(userB)).toBeLessThanOrEqual(LIMIT)

    // The two users' records are independent — userA's usage does not bleed
    // into userB's store and vice-versa
    const storeA = _withdrawalStore.get(userA) ?? []
    const storeB = _withdrawalStore.get(userB) ?? []
    storeA.forEach((r) => expect(r.userId).toBe(userA))
    storeB.forEach((r) => expect(r.userId).toBe(userB))
  })
})

// ---------------------------------------------------------------------------
// 3. TIER_3 concurrent — all allowed (unlimited)
// ---------------------------------------------------------------------------

describe('Concurrency — TIER_3 unlimited allows all concurrent requests', () => {
  it('all 20 concurrent $50,000 requests are approved for TIER_3 user', async () => {
    const userId = freshUser()
    const CONCURRENCY = 20

    const requests = Array.from({ length: CONCURRENCY }, () =>
      canWithdraw(userId, 5_000_000, 'TIER_3') // $50,000 each
    )
    const results = await Promise.all(requests)

    // Every single request must be allowed — TIER_3 has no cap
    const allowed = results.filter((r) => r.allowed)
    const rejected = results.filter((r) => !r.allowed)

    expect(allowed.length).toBe(CONCURRENCY)
    expect(rejected.length).toBe(0)

    // remaining and dailyLimit must always be null for TIER_3
    allowed.forEach((r) => {
      expect(r.remaining).toBeNull()
      expect(r.dailyLimit).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// 4. Mixed-tier requests — sequential tier change for same userId
// ---------------------------------------------------------------------------

describe('Concurrency — mixed tier sequence for the same user', () => {
  it('TIER_1 requests are limited, then TIER_2 requests use a larger limit for the same userId', async () => {
    const userId = freshUser()
    const TIER1_LIMIT = KYC_TIERS.TIER_1.dailyLimit as number // 100_000 cents
    const TIER2_LIMIT = KYC_TIERS.TIER_2.dailyLimit as number // 1_000_000 cents

    // Phase 1 — fire 5 × $300 as TIER_1 (exactly as in the existing baseline test)
    const tier1Requests = Array.from({ length: 5 }, () =>
      canWithdraw(userId, 30_000, 'TIER_1')
    )
    const tier1Results = await Promise.all(tier1Requests)

    const tier1Allowed = tier1Results.filter((r) => r.allowed)
    // Only 3 × $300 = $900 fit under TIER_1's $1,000 cap
    expect(tier1Allowed.length).toBe(3)
    expect(getRollingTotal(userId)).toBeLessThanOrEqual(TIER1_LIMIT)

    // Simulate a tier upgrade — the user is now TIER_2.
    // The rolling total from phase 1 ($900) still counts, but the ceiling is now $10,000.
    // Phase 2 — 3 × $3,000 concurrently as TIER_2 (total new request = $9,000)
    // Existing usage is $900, so $900 + $9,000 = $9,900 ≤ $10,000 → all should pass
    const tier2Requests = Array.from({ length: 3 }, () =>
      canWithdraw(userId, 300_000, 'TIER_2')
    )
    const tier2Results = await Promise.all(tier2Requests)

    const tier2Allowed = tier2Results.filter((r) => r.allowed)
    expect(tier2Allowed.length).toBe(3)

    // Combined rolling total must not exceed TIER_2 limit
    const finalTotal = getRollingTotal(userId)
    expect(finalTotal).toBeLessThanOrEqual(TIER2_LIMIT)
    // $900 (from phase 1) + 3 × $3,000 = $9,900
    expect(finalTotal).toBe(990_000)
  })
})

// ---------------------------------------------------------------------------
// 5. High concurrency stress test — 50 × $20 = exactly $1,000
// ---------------------------------------------------------------------------

describe('Concurrency — high concurrency stress test (50 × $20 = $1,000)', () => {
  it('all 50 concurrent $20 requests are approved when total equals TIER_1 limit exactly', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number // 100_000 cents
    const CONCURRENCY = 50
    const AMOUNT_PER_REQUEST = 2_000 // $20 in cents; 50 × 2_000 = 100_000 = LIMIT

    const requests = Array.from({ length: CONCURRENCY }, () =>
      canWithdraw(userId, AMOUNT_PER_REQUEST, 'TIER_1')
    )
    const results = await Promise.all(requests)

    const allowed = results.filter((r) => r.allowed)
    const rejected = results.filter((r) => !r.allowed)

    // 50 × $20 = $1,000 = LIMIT exactly — every request must be allowed
    expect(allowed.length).toBe(CONCURRENCY)
    expect(rejected.length).toBe(0)

    // Store total must equal the limit exactly (no over-approval, no under-approval)
    const total = getRollingTotal(userId)
    expect(total).toBe(LIMIT)
  })
})

// ---------------------------------------------------------------------------
// 6. Lock release on TIER_0 rejection — no deadlock
// ---------------------------------------------------------------------------

describe('Concurrency — TIER_0 lock release (no deadlock)', () => {
  it('10 concurrent TIER_0 requests all return KYC_REQUIRED without hanging', async () => {
    const userId = freshUser()
    const CONCURRENCY = 10

    const requests = Array.from({ length: CONCURRENCY }, () =>
      canWithdraw(userId, 10_000, 'TIER_0')
    )

    // If the lock is not released properly on TIER_0 early-return this will
    // deadlock and the test will time out.
    const results = await Promise.all(requests)

    expect(results).toHaveLength(CONCURRENCY)
    results.forEach((r) => {
      expect(r.allowed).toBe(false)
      expect(r.reason).toBe('KYC_REQUIRED')
      expect(r.remaining).toBe(0)
      expect(r.dailyLimit).toBe(0)
    })

    // No records should have been written for a TIER_0 user
    expect(_withdrawalStore.get(userId) ?? []).toHaveLength(0)
  })

  it('TIER_0 rejection followed by TIER_1 request succeeds — lock chain not broken', async () => {
    const userId = freshUser()

    // Force a queue of TIER_0 rejections
    const tier0Batch = Array.from({ length: 5 }, () =>
      canWithdraw(userId, 5_000, 'TIER_0')
    )
    await Promise.all(tier0Batch)

    // After all TIER_0 rejections, a legitimate TIER_1 request must still work
    const result = await canWithdraw(userId, 10_000, 'TIER_1')
    expect(result.allowed).toBe(true)
    expect(getRollingTotal(userId)).toBe(10_000)
  })
})

// ---------------------------------------------------------------------------
// 7. Lock release after limit exceeded — subsequent batch fully rejected
// ---------------------------------------------------------------------------

describe('Concurrency — lock release after limit exceeded', () => {
  it('first batch fills the limit; second batch is fully rejected without deadlock', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number // 100_000 cents

    // Batch 1: 4 × $250 = $1,000 — exactly fills the limit
    const firstBatch = Array.from({ length: 4 }, () =>
      canWithdraw(userId, 25_000, 'TIER_1')
    )
    const firstResults = await Promise.all(firstBatch)
    expect(firstResults.every((r) => r.allowed)).toBe(true)
    expect(getRollingTotal(userId)).toBe(LIMIT)

    // Batch 2: 5 concurrent requests after the limit is full — all must be rejected
    // If the lock were not released correctly this would deadlock.
    const secondBatch = Array.from({ length: 5 }, () =>
      canWithdraw(userId, 10_000, 'TIER_1')
    )
    const secondResults = await Promise.all(secondBatch)

    expect(secondResults).toHaveLength(5)
    secondResults.forEach((r) => {
      expect(r.allowed).toBe(false)
      expect(r.reason).toBe('WITHDRAWAL_LIMIT_EXCEEDED')
      expect(r.remaining).toBe(0)
    })

    // Total must not have grown past the limit
    expect(getRollingTotal(userId)).toBe(LIMIT)
  })

  it('interleaved allow/reject batches do not deadlock', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number

    // Fill half the limit serially first
    seedCompleted(userId, 50_000, hoursAgo(1)) // $500

    // Now fire 8 × $100 concurrently — 5 should be allowed ($500 + $500 = $1,000),
    // 3 should be rejected
    const batch = Array.from({ length: 8 }, () =>
      canWithdraw(userId, 10_000, 'TIER_1')
    )
    const results = await Promise.all(batch)

    const allowed = results.filter((r) => r.allowed)
    const rejected = results.filter((r) => !r.allowed)

    expect(allowed.length).toBe(5)
    expect(rejected.length).toBe(3)
    expect(getRollingTotal(userId)).toBeLessThanOrEqual(LIMIT)
    // $500 seeded + 5 × $100 approved = $1,000
    expect(getRollingTotal(userId)).toBe(100_000)
  })
})

// ---------------------------------------------------------------------------
// 8. Store consistency after concurrency
// ---------------------------------------------------------------------------

describe('Concurrency — store consistency verification', () => {
  it('getRollingTotal() equals the sum of all approved request amounts after concurrent run', async () => {
    const userId = freshUser()
    const AMOUNT = 15_000 // $150 per request
    const CONCURRENCY = 9 // 9 × $150 = $1,350 → only 6 fit in $1,000 (6 × $150 = $900)

    const requests = Array.from({ length: CONCURRENCY }, () =>
      canWithdraw(userId, AMOUNT, 'TIER_1')
    )
    const results = await Promise.all(requests)

    const allowedCount = results.filter((r) => r.allowed).length

    // The rolling total in the store must precisely equal the approved sum
    const expectedTotal = allowedCount * AMOUNT
    expect(getRollingTotal(userId)).toBe(expectedTotal)

    // Sanity-check: total must not exceed the limit
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number
    expect(getRollingTotal(userId)).toBeLessThanOrEqual(LIMIT)
  })

  it('store contains exactly one record per approved concurrent request', async () => {
    const userId = freshUser()
    const CONCURRENCY = 7
    const AMOUNT = 10_000 // $100 — all 7 should fit ($700 ≤ $1,000)

    const requests = Array.from({ length: CONCURRENCY }, () =>
      canWithdraw(userId, AMOUNT, 'TIER_1')
    )
    const results = await Promise.all(requests)

    const allowedCount = results.filter((r) => r.allowed).length
    expect(allowedCount).toBe(CONCURRENCY) // all 7 should be allowed

    // The in-memory store must hold exactly 7 records for this user
    const stored = _withdrawalStore.get(userId) ?? []
    expect(stored).toHaveLength(CONCURRENCY)

    // Every stored record belongs to this user and has the correct amount
    stored.forEach((record) => {
      expect(record.userId).toBe(userId)
      expect(record.amountCents).toBe(AMOUNT)
      expect(record.status).toBe('pending')
    })

    // Sum of stored amounts equals getRollingTotal
    const storedSum = stored.reduce((acc, r) => acc + r.amountCents, 0)
    expect(storedSum).toBe(getRollingTotal(userId))
  })

  it('rejected requests leave no trace in the store', async () => {
    const userId = freshUser()
    const LIMIT = KYC_TIERS.TIER_1.dailyLimit as number

    // Fill the limit completely first
    seedCompleted(userId, LIMIT, hoursAgo(1))

    // 5 concurrent rejections
    const requests = Array.from({ length: 5 }, () =>
      canWithdraw(userId, 10_000, 'TIER_1')
    )
    const results = await Promise.all(requests)
    expect(results.every((r) => !r.allowed)).toBe(true)

    // Only the original seeded record should be in the store (no new records added)
    const stored = _withdrawalStore.get(userId) ?? []
    expect(stored).toHaveLength(1)
    expect(stored[0].amountCents).toBe(LIMIT)
    expect(stored[0].status).toBe('completed')
  })
})
