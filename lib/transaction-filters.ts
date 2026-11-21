import type { Payment, PaymentStatus, Refund } from '@/lib/api'

export function searchPayments(payments: Payment[], query: string): Payment[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return payments

  return payments.filter((payment) =>
    [payment.tx_hash, payment.wallet_address, payment.asset].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  )
}

export function searchRefunds(refunds: Refund[], query: string): Refund[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return refunds

  return refunds.filter((refund) =>
    [refund.payment_id, refund.recipient ?? '', refund.asset].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  )
}

export function filterPaymentsByStatus(
  payments: Payment[],
  status: PaymentStatus | 'all'
): Payment[] {
  if (status === 'all') return payments
  return payments.filter((payment) => payment.status === status)
}

export function filterByDateRange<T extends { created_at: string }>(
  items: T[],
  fromDate: string,
  toDate: string
): T[] {
  if (!fromDate && !toDate) return items

  const start = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
  const end = toDate ? new Date(`${toDate}T00:00:00`) : null
  if (end) end.setDate(end.getDate() + 1)
  const endExclusive = end?.getTime() ?? null

  return items.filter((item) => {
    const createdAt = new Date(item.created_at).getTime()
    return (
      Number.isFinite(createdAt) &&
      (start === null || createdAt >= start) &&
      (endExclusive === null || createdAt < endExclusive)
    )
  })
}

export function filterPaymentsByDateRange(
  payments: Payment[],
  fromDate: string,
  toDate: string
): Payment[] {
  return filterByDateRange(payments, fromDate, toDate)
}
