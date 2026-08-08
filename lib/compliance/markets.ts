/**
 * Market resolution and currency normalisation.
 *
 * Payment routes speak in local currency and provider-specific country codes;
 * every rule in this module speaks in USD cents and a market policy.  This file
 * is the only place that translation happens, so a route cannot quietly invent
 * its own conversion — the same reason screenTransaction() is the only entry
 * point for risk.
 *
 * The tables it reads (CURRENCY_MARKETS, FX_USD_CENTS_PER_UNIT,
 * UNLICENSED_MARKET_POLICY) live in ./config.ts with everything else a
 * compliance officer tunes.  Logic here, figures there.
 */

import {
  CURRENCY_MARKETS,
  FX_USD_CENTS_PER_UNIT,
  JURISDICTIONS,
  UNLICENSED_MARKET_POLICY,
  type JurisdictionPolicy,
} from './config'
import type { Jurisdiction, Market } from './types'

/**
 * Raised when a payment cannot be mapped onto any screening policy.
 *
 * Callers must treat this as a refusal, not a warning.  An unmappable currency
 * means the engine has no threshold to measure the transaction against, and a
 * transaction that cannot be measured has not been screened.
 */
export class UnsupportedMarketError extends Error {
  readonly code = 'UNSUPPORTED_MARKET'
  readonly currency: string

  constructor(currency: string) {
    super(`No screening policy for currency ${currency}`)
    this.name = 'UnsupportedMarketError'
    this.currency = currency
  }
}

/** Whether `market` is one Aframp holds an AML registration in. */
export function isLicensedJurisdiction(market: Market): market is Jurisdiction {
  return market in JURISDICTIONS
}

/**
 * The policy governing a market.
 *
 * Falls back to UNLICENSED_MARKET_POLICY rather than throwing: by the time a
 * transaction reaches a rule it has already been accepted for screening, and a
 * rule that throws mid-screening would fail *open* — the caller's catch block
 * cannot distinguish "engine broken" from "market unknown", and the transaction
 * ends up unscreened either way.  Refusal belongs at the edge, in
 * resolveMarket(), before any of this runs.
 */
export function policyFor(market: Market): JurisdictionPolicy {
  return JURISDICTIONS[market as Jurisdiction] ?? UNLICENSED_MARKET_POLICY
}

/**
 * Maps an ISO 4217 currency onto the market whose policy governs it.
 *
 * Throws UnsupportedMarketError for anything unmapped.  Guessing — defaulting
 * to the strictest market, say — would produce a screening record that claims a
 * jurisdiction the transaction never touched, which is worse than a refusal:
 * it looks like a control operating correctly.
 */
export function resolveMarket(currency: string): Market {
  const market = CURRENCY_MARKETS[currency.trim().toUpperCase()]
  if (!market) throw new UnsupportedMarketError(currency)
  return market
}

/**
 * Converts a local-currency major-unit amount to integer USD cents.
 *
 * Rounds half-up.  Sub-cent precision is meaningless against thresholds in the
 * thousands of dollars, and rounding *up* keeps a transaction from landing just
 * under a band edge through arithmetic alone.
 */
export function toUsdCents(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError(`Amount must be a positive finite number, got ${amount}`)
  }

  const rate = FX_USD_CENTS_PER_UNIT[currency.trim().toUpperCase()]
  if (rate === undefined) throw new UnsupportedMarketError(currency)

  return Math.round(amount * rate)
}
