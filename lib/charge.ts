/**
 * Fiat previews are derived from stroops, so they must stay integer-only too.
 * The rate is expressed in fiat sub-units (kobo) per whole asset unit.
 */

import { APP_LOCALE } from '@/lib/locale'
import { parseAmountToStroops, STROOPS_PER_UNIT } from '@/lib/money'

const KOBO_PER_UNIT = 100n

function toKoboRate(rate: number | bigint): bigint | null {
  if (typeof rate === 'bigint') return rate >= 0n ? rate : null
  if (!Number.isSafeInteger(rate) || rate < 0) return null
  return BigInt(rate)
}

/** `'50'` with a rate of `24900` kobo returns `'≈ ₦12,450'`. */
export function calculateFiatEquivalent(
  input: string,
  rateKobo: number | bigint,
  currencySymbol = '₦'
): string {
  const stroops = parseAmountToStroops(input)
  const rate = toKoboRate(rateKobo)
  if (stroops === null || stroops <= 0n || rate === null || rate <= 0n) {
    return `≈ ${currencySymbol}0`
  }

  // Round to the nearest kobo with integer arithmetic — never a float product.
  const totalKobo = (stroops * rate + STROOPS_PER_UNIT / 2n) / STROOPS_PER_UNIT
  const whole = totalKobo / KOBO_PER_UNIT
  const fraction = totalKobo % KOBO_PER_UNIT
  const cents = fraction === 0n ? '' : `.${fraction.toString().padStart(2, '0').replace(/0+$/, '')}`

  return `≈ ${currencySymbol}${whole.toLocaleString(APP_LOCALE)}${cents}`
}
