/**
 * Withdrawal limit service — enforces KYC-tier-based rolling 24-hour limits.
 *
 * Storage layer:
 *   In this project there is no persistent database yet.  The service uses an
 *   in-memory store that is intentionally shaped to mirror a real SQL table so
 *   the swap-out to Prisma / Drizzle is a one-file change.
 *
 *   The in-memory store is keyed by userId (wallet public key) and holds an
 *   array of withdrawal records.  In production this would be replaced by:
 *
 *     SELECT SUM(amount_cents) FROM withdrawals
 *     WHERE user_id = $1
 *       AND status IN ('pending', 'completed')
 *       AND created_at >= NOW() - INTERVAL '24 hours'
 *
 *   The created_at column MUST be indexed — see
 *   db/migrations/001_index_withdrawals_created_at.sql.
 *
 * Concurrency:
 *   canWithdraw() uses a per-user mutex (Promise chain) so that concurrent
 *   requests for the same user are serialised.  This prevents double-spend
 *   past the limit when two requests arrive simultaneously.
 */

import { KYC_TIERS, type KycTier } from './tiers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WithdrawalStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface WithdrawalRecord {
  id: string
  userId: string
  amountCents: number
  status: WithdrawalStatus
  createdAt: Date
}

export interface CanWithdrawResult {
  allowed: boolean
  reason?: 'KYC_REQUIRED' | 'WITHDRAWAL_LIMIT_EXCEEDED'
  /** Remaining allowance in cents after this withdrawal would be applied. */
  remaining: number | null
  /** ISO 8601 timestamp when the oldest in-window tx falls out of the window. */
  resetAt: string | null
  /** Snapshot of used amount (cents) at decision time. */
  used: number
  /** The tier's daily limit in cents (null = unlimited). */
  dailyLimit: number | null
}

// ---------------------------------------------------------------------------
// In-memory store (replace with DB queries in production)
// ---------------------------------------------------------------------------

/**
 * Map<userId, WithdrawalRecord[]>
 * Exported so tests can seed and inspect state directly.
 */
export const _withdrawalStore = new Map<string, WithdrawalRecord[]>()

/** Per-user mutex — serialises concurrent canWithdraw calls for the same user. */
const _userLocks = new Map<string, Promise<unknown>>()

function _acquireLock(userId: string): { release: () => void; ready: Promise<void> } {
  let releaseFn: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    const prev = _userLocks.get(userId) ?? Promise.resolve()
    _userLocks.set(
      userId,
      prev.then(() => {
        resolve()
        return new Promise<void>((r) => {
          releaseFn = r
        })
      })
    )
  })
  return {
    ready,
    release: () => {
      releaseFn()
    },
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Returns the sum of all pending/completed withdrawal amounts (in cents) for
 * `userId` within the rolling `windowMs` millisecond window.
 *
 * In production replace the body with a parameterised DB query that uses the
 * indexed created_at column.
 */
export function getRollingTotal(userId: string, windowMs = 86_400_000): number {
  const cutoff = new Date(Date.now() - windowMs)
  const records = _withdrawalStore.get(userId) ?? []
  return records
    .filter(
      (r) =>
        (r.status === 'pending' || r.status === 'completed') && r.createdAt >= cutoff
    )
    .reduce((sum, r) => sum + r.amountCents, 0)
}

/**
 * Returns the earliest createdAt among in-window pending/completed records,
 * or null if there are none.  Adding 24 h to this gives the resetAt time.
 */
export function getOldestInWindowDate(userId: string, windowMs = 86_400_000): Date | null {
  const cutoff = new Date(Date.now() - windowMs)
  const records = _withdrawalStore.get(userId) ?? []
  const inWindow = records.filter(
    (r) =>
      (r.status === 'pending' || r.status === 'completed') && r.createdAt >= cutoff
  )
  if (inWindow.length === 0) return null
  return inWindow.reduce((oldest, r) => (r.createdAt < oldest ? r.createdAt : oldest), inWindow[0].createdAt)
}

/**
 * Returns the remaining withdrawal allowance in cents for the current 24-hour
 * window.  Returns null for TIER_3 (unlimited).
 */
export function getRemainingLimit(userId: string, kycTier: KycTier, windowMs = 86_400_000): number | null {
  const { dailyLimit } = KYC_TIERS[kycTier]
  if (dailyLimit === null) return null // unlimited
  const used = getRollingTotal(userId, windowMs)
  return Math.max(dailyLimit - used, 0)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determines whether a withdrawal of `amountCents` is permitted for `userId`
 * at `kycTier`.
 *
 * This function is safe to call concurrently for the same user — calls are
 * serialised via a per-user lock so two simultaneous requests cannot both
 * pass the limit check and together exceed the cap.
 *
 * @param userId      Wallet public key or any stable user identifier.
 * @param amountCents Withdrawal amount in cents (must be > 0).
 * @param kycTier     The user's current KYC tier.
 * @param windowMs    Rolling window in milliseconds (default 24 h).
 */
export async function canWithdraw(
  userId: string,
  amountCents: number,
  kycTier: KycTier,
  windowMs = 86_400_000
): Promise<CanWithdrawResult> {
  const { ready, release } = _acquireLock(userId)
  await ready

  try {
    const { dailyLimit } = KYC_TIERS[kycTier]

    // TIER_0 — always rejected regardless of amount
    if (kycTier === 'TIER_0') {
      return {
        allowed: false,
        reason: 'KYC_REQUIRED',
        remaining: 0,
        resetAt: null,
        used: 0,
        dailyLimit: 0,
      }
    }

    // TIER_3 — always allowed, no limit
    if (dailyLimit === null) {
      return {
        allowed: true,
        remaining: null,
        resetAt: null,
        used: getRollingTotal(userId, windowMs),
        dailyLimit: null,
      }
    }

    // TIER_1 / TIER_2 — rolling window check
    const used = getRollingTotal(userId, windowMs)
    const wouldUse = used + amountCents

    if (wouldUse > dailyLimit) {
      const remaining = Math.max(dailyLimit - used, 0)
      const oldest = getOldestInWindowDate(userId, windowMs)
      const resetAt = oldest ? new Date(oldest.getTime() + windowMs).toISOString() : null

      return {
        allowed: false,
        reason: 'WITHDRAWAL_LIMIT_EXCEEDED',
        remaining,
        resetAt,
        used,
        dailyLimit,
      }
    }

    // Allowed — record the pending withdrawal immediately inside the lock so
    // concurrent requests see the updated total.
    const record: WithdrawalRecord = {
      id: `wd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      amountCents,
      status: 'pending',
      createdAt: new Date(),
    }
    const existing = _withdrawalStore.get(userId) ?? []
    _withdrawalStore.set(userId, [...existing, record])

    const newUsed = used + amountCents
    const remaining = Math.max(dailyLimit - newUsed, 0)
    const oldest = getOldestInWindowDate(userId, windowMs)
    const resetAt = oldest ? new Date(oldest.getTime() + windowMs).toISOString() : null

    return {
      allowed: true,
      remaining,
      resetAt,
      used: newUsed,
      dailyLimit,
    }
  } finally {
    release()
  }
}

/**
 * Marks a previously-recorded pending withdrawal as completed or failed.
 * Call this after the on-chain transaction settles.
 *
 * In production this would be an UPDATE withdrawals SET status = $2 WHERE id = $1.
 */
export function updateWithdrawalStatus(
  userId: string,
  withdrawalId: string,
  status: WithdrawalStatus
): boolean {
  const records = _withdrawalStore.get(userId)
  if (!records) return false
  const record = records.find((r) => r.id === withdrawalId)
  if (!record) return false
  record.status = status
  return true
}

/**
 * Seeds a withdrawal record directly into the store.
 * Used by tests and by the API route when replaying historical transactions.
 */
export function seedWithdrawal(record: WithdrawalRecord): void {
  const existing = _withdrawalStore.get(record.userId) ?? []
  _withdrawalStore.set(record.userId, [...existing, record])
}

/** Clears all records for a user.  Test helper only. */
export function _clearUserRecords(userId: string): void {
  _withdrawalStore.delete(userId)
  _userLocks.delete(userId)
}
