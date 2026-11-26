import type { Payment } from '@/lib/api'
import { formatStroops } from '@/lib/money'

/**
 * Case-insensitive search across every field a merchant might paste in:
 * payment id, merchant id, tx hash, wallet address, asset, and amount
 * (both the formatted amount, e.g. "12.5", and raw stroops).
 */
export function searchPayments(payments: Payment[], query: string): Payment[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return payments

  return payments.filter((payment) =>
    [
      payment.id,
      payment.merchant_id,
      payment.tx_hash,
      payment.wallet_address,
      payment.asset,
      formatStroops(payment.amount_stroops),
      String(payment.amount_stroops),
    ].some((value) => value != null && String(value).toLowerCase().includes(normalizedQuery))
  )
}

export type DateRangeFilterResult = {
  payments: Payment[]
  /** Bounds that could not be parsed and were therefore ignored. */
  invalid: Array<'fromDate' | 'toDate'>
}

function parseDayStart(value: string | null | undefined): number | null | 'invalid' {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) ? date.getTime() : 'invalid'
}

/**
 * Filters payments to [fromDate, toDate] inclusive, using local-day bounds
 * (`YYYY-MM-DD`). A malformed bound is ignored (treated as open) and reported
 * in `invalid`, instead of silently dropping every row.
 */
export function filterPaymentsByDateRangeDetailed(
  payments: Payment[],
  fromDate?: string | null,
  toDate?: string | null
): DateRangeFilterResult {
  const invalid: DateRangeFilterResult['invalid'] = []

  const parsedStart = parseDayStart(fromDate)
  if (parsedStart === 'invalid') invalid.push('fromDate')
  const start = typeof parsedStart === 'number' ? parsedStart : null

  const parsedEnd = parseDayStart(toDate)
  if (parsedEnd === 'invalid') invalid.push('toDate')
  let endExclusive: number | null = null
  if (typeof parsedEnd === 'number') {
    const end = new Date(parsedEnd)
    end.setDate(end.getDate() + 1)
    endExclusive = end.getTime()
  }

  if (start === null && endExclusive === null) return { payments, invalid }

  const filtered = payments.filter((payment) => {
    const createdAt = new Date(payment.created_at).getTime()
    if (!Number.isFinite(createdAt)) return false
    if (start !== null && createdAt < start) return false
    if (endExclusive !== null && createdAt >= endExclusive) return false
    return true
  })

  return { payments: filtered, invalid }
}

export function filterPaymentsByDateRange(
  payments: Payment[],
  fromDate?: string | null,
  toDate?: string | null
): Payment[] {
  return filterPaymentsByDateRangeDetailed(payments, fromDate, toDate).payments
}
