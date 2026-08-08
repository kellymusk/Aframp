/**
 * Provider abstraction.
 *
 * The requirement named three candidate vendors — Elliptic, Chainalysis and
 * ComplyAdvantage — so the code commits to none of them.  They are not
 * interchangeable in the first place: Elliptic and Chainalysis do blockchain
 * analytics (is *this address* risky), ComplyAdvantage does entity screening
 * (is *this person* listed).  A ramp needs both halves, which is why the
 * interface is split in two rather than being one `ComplianceProvider`.
 *
 * Adapters normalise each vendor's scoring onto a common 0–100 scale so the
 * risk engine never learns vendor-specific vocabulary.  Swapping vendor, or
 * running one per market, is then a config change.
 */

import type { NameScreeningResult, WalletRiskResult } from '../types'

/** Blockchain analytics: Chainalysis, Elliptic, TRM, … */
export interface WalletRiskProvider {
  readonly name: string
  /**
   * @param address Counterparty address, as the chain formats it.
   * @param chain   Chain identifier, e.g. "Stellar", "Ethereum".
   */
  screenWallet(address: string, chain: string): Promise<WalletRiskResult>
}

/** Entity screening: ComplyAdvantage, Dow Jones, Refinitiv, … */
export interface NameScreeningProvider {
  readonly name: string
  screenName(name: string, options?: NameScreeningOptions): Promise<NameScreeningResult>
}

export interface NameScreeningOptions {
  /** Country hint (ISO 3166-1 alpha-2) — narrows false positives. */
  country?: string
  /** True when the name belongs to a business rather than a person. */
  entity?: boolean
  /** Correlation id echoed into provider logs for audit. */
  clientRef?: string
}

/**
 * Raised when a provider cannot answer — network failure, timeout, auth error,
 * malformed response.
 *
 * Never swallowed into a clean result.  A screening call that failed must be
 * distinguishable from one that returned "no hits", or an outage silently
 * becomes an approval.  Callers translate this into PROVIDER_UNAVAILABLE and,
 * under FAIL_CLOSED, a review hold.
 */
export class ProviderError extends Error {
  readonly provider: string
  readonly cause?: unknown

  constructor(provider: string, message: string, cause?: unknown) {
    super(`[${provider}] ${message}`)
    this.name = 'ProviderError'
    this.provider = provider
    this.cause = cause
  }
}

/**
 * Rejects with ProviderError if `promise` has not settled within `timeoutMs`.
 *
 * A screening call blocks a payment, so an unbounded wait on a vendor is a
 * self-inflicted outage.  Note this abandons rather than cancels the in-flight
 * request — vendors are billed per call, so a timed-out call still costs.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ProviderError(provider, `Timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
