/**
 * 7-day revenue aggregation for the home dashboard's chart (#494).
 *
 * Derived entirely from `listTransactions`' `Payment[]` — no separate API
 * call. Amounts of different assets can't be meaningfully summed together
 * (a stroop of XLM and a stroop of cNGN aren't the same value), so this
 * buckets per day *and* per asset rather than producing one blended total.
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
 * Largest stroop value that converts to a `number` without precision loss.
 *
 * `Number()` can only represent integers exactly up to 2^53 - 1
 * (`Number.MAX_SAFE_INTEGER`). Above that, converting a `bigint` silently
 * rounds, so the chart would show wrong totals. At 7 decimal places this
 * boundary is ~900,719,925 whole units per asset per day.
 */
export const MAX_SAFE_STROOPS = BigInt(Number.MAX_SAFE_INTEGER)

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function weekdayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Converts aggregated stroops to whole units for display, guarding against
 * silent precision loss. Values above `MAX_SAFE_STROOPS` are clamped to the
 * largest exactly-representable value and a warning is emitted, so the chart
 * degrades visibly rather than showing a plausible-but-wrong total.
 */
function stroopsToUnits(stroops: bigint, asset: string): number {
  if (stroops > MAX_SAFE_STROOPS) {
    console.warn(
      `[revenue] ${asset} daily total (${stroops} stroops) exceeds ` +
        `Number.MAX_SAFE_INTEGER (${MAX_SAFE_STROOPS}); clamping to avoid ` +
        `precision loss in the revenue chart.`
    )
    return Number(MAX_SAFE_STROOPS) / Number(STROOPS_PER_UNIT)
  }
  return Number(stroops) / Number(STROOPS_PER_UNIT)
}

/**
 * Buckets confirmed payments into the last 7 calendar days (today
 * inclusive), summing `amount_stroops` per asset per day. `now` is
 * injectable so tests don't depend on the real clock.
 *
 * Amounts are converted from stroops to whole units only here, for display —
 * this is a chart aggregate, not a ledger balance. Conversion is guarded by
 * `stroopsToUnits` so totals above `Number.MAX_SAFE_INTEGER` stroops are
 * clamped and warned about instead of silently rounded.
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
      day.totals[asset] = stroopsToUnits(stroops, asset)
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
