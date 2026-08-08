/**
 * WithdrawalLimitError — thrown when a withdrawal is blocked by KYC tier limits.
 * Maps to HTTP 403 in the API route handler.
 */

import type { KycTier } from './tiers'
import { KYC_TIERS } from './tiers'

export class WithdrawalLimitError extends Error {
  readonly reason: 'KYC_REQUIRED' | 'WITHDRAWAL_LIMIT_EXCEEDED'
  readonly kycTier: KycTier
  readonly dailyLimit: number | null
  readonly used: number
  readonly remaining: number | null
  readonly resetAt: string | null

  constructor(
    reason: 'KYC_REQUIRED' | 'WITHDRAWAL_LIMIT_EXCEEDED',
    kycTier: KycTier,
    used: number,
    remaining: number | null,
    resetAt: string | null
  ) {
    super(reason === 'KYC_REQUIRED' ? 'KYC verification required to withdraw' : 'Daily withdrawal limit exceeded')
    this.name = 'WithdrawalLimitError'
    this.reason = reason
    this.kycTier = kycTier
    this.dailyLimit = KYC_TIERS[kycTier].dailyLimit
    this.used = used
    this.remaining = remaining
    this.resetAt = resetAt
  }

  /** Serialises to the canonical 403 response body. */
  toResponseBody() {
    return {
      error: 'WITHDRAWAL_LIMIT_EXCEEDED',
      kycTier: this.kycTier,
      dailyLimit: this.dailyLimit,
      used: this.used,
      remaining: this.remaining,
      resetAt: this.resetAt,
    }
  }
}
