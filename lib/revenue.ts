/**
 * 7-day revenue aggregation for the home dashboard's chart (#494).
 *
 * Derived entirely from `listTransactions`' `Payment[]` — no separate API
 * call. Amounts of different assets can't be meaningfully summed together
 * (a stroop of XLM and a stroop of cNGN aren't the same value), so this
 * buckets per day *and* per asset rather than producing one blended total.
 *
 * PRECISION NOTE: Stroops are converted to Number for display. Number() silently
 * loses precision for values > Number.MAX_SAFE_INTEGER (2^53 - 1, ~9e15).
 * For XLM (12 decimals), this is ~900 million XLM. Merchants with balances above
 * this threshold will see rounded chart values. Set a warning/cap if needed.
 */

import type { Payment } from './api'
import { STROOPS_PER_UNIT } from './money'

export interface DailyRevenueEntry {
  /** ISO calendar date (YYYY-MM-DD) this entry aggregates. */
  date: string
  /** Short weekday label for the chart's x-axis, e.g. "Mon". */
  label: string
  /** Confirmed revenue that day, in whole units (not stroops), keyed by asset. */
  totals: Record<string, number>
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Returns the ISO calendar date (YYYY-MM-DD) for the given date in UTC.
 * Uses UTC to match backend and activity-highlights day boundaries.
 */
function dateKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weekdayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}

/**
 * Buckets confirmed payments into the last 7 calendar days (today
 * inclusive), summing `amount_stroops` per asset per day. `now` is
 * injectable so tests don't depend on the real clock.
 *
 * Amounts are converted from stroops to whole units only here, for display —
 * this is a chart aggregate, not a ledger balance. Note: values exceeding
 * Number.MAX_SAFE_INTEGER (~9e15 stroops, ~900M XLM for 12-decimal assets)
 * will round silently. A warning is logged if this occurs.
 */
export function buildDailyRevenue(
  payments: Payment[],
  now: Date = new Date()
): DailyRevenueEntry[] {
  const days: DailyRevenueEntry[] = []
  const totalsByDay = new Map<string, Map<string, bigint>>()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY_MS)
    const key = dateKey(date)
    totalsByDay.set(key, new Map())
    days.push({ date: key, label: weekdayLabel(date), totals: {} })
  }

  const earliest = days[0].date

  for (const payment of payments) {
    if (payment.status !== 'confirmed') continue
    const key = dateKey(new Date(payment.created_at))
    if (key < earliest) continue // outside the 7-day window
    const dayTotals = totalsByDay.get(key)
    if (!dayTotals) continue // e.g. created_at in the future due to clock skew
    dayTotals.set(payment.asset, (dayTotals.get(payment.asset) ?? 0n) + payment.amount_stroops)
  }

  for (const day of days) {
    const dayTotals = totalsByDay.get(day.date)
    if (!dayTotals) continue
    for (const [asset, stroops] of dayTotals) {
      if (stroops > Number.MAX_SAFE_INTEGER) {
        console.warn(
          `[revenue] Precision loss: ${asset} balance ${stroops} exceeds MAX_SAFE_INTEGER. ` +
          `Converted value may be rounded. Consider using BigInt display or capping display.`
        )
      }
      day.totals[asset] = Number(stroops) / Number(STROOPS_PER_UNIT)
    }
  }

  return days
}

/** Every asset that appears anywhere in the 7-day series, in first-seen order. */
export function assetsInSeries(entries: DailyRevenueEntry[]): string[] {
  const seen = new Set<string>()
  for (const entry of entries) {
    for (const asset of Object.keys(entry.totals)) seen.add(asset)
  }
  return [...seen]
}
