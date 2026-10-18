/**
 * Stellar amounts are integers of stroops: 1 unit = 10,000,000 stroops.
 *
 * Everything in this app carries amounts as `bigint` stroops and only converts
 * to a decimal string at the edge, for display. Floats are never used — 0.1 + 0.2
 * is not 0.3, and this is a ledger.
 */

import { APP_LOCALE } from '@/lib/locale'

export const DECIMALS = 7
export const STROOPS_PER_UNIT = 10_000_000n

/** `25000000n` -> `"2.5"`. Trailing zeros in the fraction are dropped. */
export function formatStroops(stroops: bigint): string {
  const negative = stroops < 0n
  const abs = negative ? -stroops : stroops
  const whole = abs / STROOPS_PER_UNIT
  const fraction = (abs % STROOPS_PER_UNIT).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole.toLocaleString(APP_LOCALE)}${fraction ? `.${fraction}` : ''}`
}

/**
 * Parses keypad input (`"2.5"`) into stroops. Returns `null` for anything that
 * isn't a well-formed amount, including more than 7 decimal places — which
 * cannot be represented on Stellar and must be rejected, not rounded.
 */
export function parseAmountToStroops(input: string): bigint | null {
  if (!/^\d*(\.\d*)?$/.test(input) || input === '' || input === '.') return null

  const [whole, fraction = ''] = input.split('.')
  if (fraction.length > DECIMALS) return null

  return BigInt(whole || '0') * STROOPS_PER_UNIT + BigInt(fraction.padEnd(DECIMALS, '0') || '0')
}

/** Withdrawals settle in kobo, so amounts must be whole multiples of 100,000 stroops. */
export const STROOPS_PER_KOBO = 100_000n

/** Returns whether an amount is aligned to the asset's supported increment. */
export function isAmountMultipleOf(stroops: bigint, incrementStroops: bigint): boolean {
  return incrementStroops > 0n && stroops % incrementStroops === 0n
}

export function isWholeKobo(stroops: bigint): boolean {
  return isAmountMultipleOf(stroops, STROOPS_PER_KOBO)
}
