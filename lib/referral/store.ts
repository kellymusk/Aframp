/**
 * Server-side referral discount consumption tracker.
 * In-memory store — replace with a DB table keyed by wallet address in production.
 */
export const consumedDiscountWallets = new Set<string>()
