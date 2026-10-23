import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { Payment } from '@/lib/api'
import { formatDateTime } from '@/lib/format-date'
import { formatStroops } from '@/lib/money'
import { PAYMENT_STATUS_LABEL, paymentStatusVariant } from '@/lib/payment-status'

export const RECENT_PAYMENTS_LIMIT = 5

/** Newest payments first, capped at `limit`. */
export function latestPayments(payments: Payment[], limit = RECENT_PAYMENTS_LIMIT): Payment[] {
  return [...payments]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limit)
}

export function RecentPayments({ payments }: { payments: Payment[] }) {
  const latest = latestPayments(payments)

  return (
    <section
      className="bg-panel border-hairline rounded-2xl border p-5"
      aria-labelledby="recent-payments-heading"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-payments-heading" className="text-lg font-bold tracking-tight text-white">
          Recent payments
        </h2>
        <Link
          href="/transactions"
          className="text-dim hover:text-bright flex items-center gap-1 text-sm transition-colors"
        >
          View all payments <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {latest.length === 0 ? (
        <p className="text-dim mt-4 text-sm">
          No payments yet. They will show up here as soon as a customer pays.
        </p>
      ) : (
        <ul className="mt-3 divide-y">
          {latest.map((payment) => {
            const label = PAYMENT_STATUS_LABEL[payment.status] ?? payment.status
            return (
              <li key={payment.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-bright text-sm font-medium tabular-nums">
                    {formatStroops(payment.amount_stroops)}{' '}
                    <span className="text-dim font-normal">{payment.asset}</span>
                  </p>
                  <p className="text-dim text-xs">{formatDateTime(payment.created_at)}</p>
                </div>
                <Badge
                  variant={paymentStatusVariant(payment.status)}
                  className="shrink-0"
                  aria-label={`Payment status: ${label}`}
                >
                  {label}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
