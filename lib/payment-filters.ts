import type { Payment, PaymentStatus } from '@/lib/api'
import { formatStroops } from '@/lib/money'

export type StatusFilter = 'all' | 'confirmed' | 'pending' | 'failed'
export type DateRangeFilter = 'all' | 'today' | '7d' | 'month' | 'custom'

export interface PaymentFilters {
  /** Matched against the formatted amount, asset, and tx hash (payments have no memo field). */
  search: string
  status: StatusFilter
  dateRange: DateRangeFilter
  /** ISO date strings (yyyy-mm-dd), only used when dateRange === 'custom'. */
  customStart: string
  customEnd: string
}

export const DEFAULT_PAYMENT_FILTERS: PaymentFilters = {
  search: '',
  status: 'all',
  dateRange: 'all',
  customStart: '',
  customEnd: '',
}

/** Statuses considered "pending" for the coarse All/Confirmed/Pending/Failed chips. */
const PENDING_STATUSES: PaymentStatus[] = ['detected', 'verified']

function matchesStatus(payment: Payment, status: StatusFilter): boolean {
  if (status === 'all') return true
  if (status === 'confirmed') return payment.status === 'confirmed'
  if (status === 'failed') return payment.status === 'failed'
  return PENDING_STATUSES.includes(payment.status)
}

function matchesSearch(payment: Payment, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true

  const amount = formatStroops(payment.amount_stroops).toLowerCase()
  const asset = payment.asset.toLowerCase()
  const reference = payment.tx_hash.toLowerCase()

  return amount.includes(query) || asset.includes(query) || reference.includes(query)
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function matchesDateRange(payment: Payment, filters: PaymentFilters): boolean {
  if (filters.dateRange === 'all') return true

  const createdAt = new Date(payment.created_at)
  const now = new Date()

  if (filters.dateRange === 'today') {
    return startOfDay(createdAt).getTime() === startOfDay(now).getTime()
  }

  if (filters.dateRange === '7d') {
    const sevenDaysAgo = startOfDay(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    return createdAt >= sevenDaysAgo
  }

  if (filters.dateRange === 'month') {
    return (
      createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()
    )
  }

  // custom
  if (filters.customStart) {
    const start = startOfDay(new Date(filters.customStart))
    if (createdAt < start) return false
  }
  if (filters.customEnd) {
    const end = startOfDay(new Date(filters.customEnd))
    end.setDate(end.getDate() + 1) // inclusive of the whole end day
    if (createdAt >= end) return false
  }
  return true
}

export function filterPayments(payments: Payment[], filters: PaymentFilters): Payment[] {
  return payments.filter(
    (payment) =>
      matchesStatus(payment, filters.status) &&
      matchesSearch(payment, filters.search) &&
      matchesDateRange(payment, filters)
  )
}
