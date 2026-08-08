/**
 * Canonical KYC tier configuration.
 * All withdrawal limit comparisons MUST reference this file — no magic numbers elsewhere.
 *
 * Amounts are in cents (USD) to avoid floating-point issues.
 * TIER_0: Unverified — no withdrawals allowed.
 * TIER_1: Basic KYC — $1,000 / 24-hour rolling window.
 * TIER_2: Intermediate KYC — $10,000 / 24-hour rolling window.
 * TIER_3: Full KYC — unlimited.
 */

export const KYC_TIERS = {
  TIER_0: { label: 'Unverified', dailyLimit: 0 },
  TIER_1: { label: 'Basic', dailyLimit: 1_000_00 }, // $1,000 in cents
  TIER_2: { label: 'Intermediate', dailyLimit: 10_000_00 }, // $10,000 in cents
  TIER_3: { label: 'Full', dailyLimit: null }, // unlimited
} as const

export type KycTier = keyof typeof KYC_TIERS

/** All valid tier keys in ascending order of privilege. */
export const KYC_TIER_KEYS: KycTier[] = ['TIER_0', 'TIER_1', 'TIER_2', 'TIER_3']

/** Type guard — returns true if the string is a valid KycTier key. */
export function isKycTier(value: unknown): value is KycTier {
  return typeof value === 'string' && value in KYC_TIERS
}
