import type { Payment } from '@/lib/api'
import { formatStroops } from '@/lib/money'

/**
 * Checks if the given ISO timestamp falls on the same UTC calendar day as `now`.
 * Uses UTC to match backend and revenue chart day boundaries.
 */
function isToday(iso: string, now: Date = new Date()): boolean {
  const date = new Date(iso)
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

/** Sums confirmed payments taken today, keyed by asset. */
function takingsToday(payments: Payment[], now: Date = new Date()): Map<string, bigint> {
  const totals = new Map<string, bigint>()
  for (const payment of payments) {
    if (payment.status !== 'confirmed' || !isToday(payment.created_at, now)) continue
    totals.set(payment.asset, (totals.get(payment.asset) ?? 0n) + payment.amount_stroops)
  }
  return totals
}

export function ActivityHighlights({
  payments,
  openRequestCount,
}: {
  payments: Payment[]
  openRequestCount: number
}) {
  const today = takingsToday(payments)

  return (
    <section className="bg-panel border-hairline rounded-2xl border p-5">
      <p className="text-dim text-xs">Today</p>
      <h2 className="text-lg font-bold tracking-tight text-white">Activity highlights</h2>

      <dl className="mt-4 space-y-3.5">
        {today.size === 0 ? (
          <div className="flex items-baseline justify-between">
            <dt className="text-dim text-sm">Taken today</dt>
            <dd className="text-bright text-sm">Nothing yet</dd>
          </div>
        ) : (
          [...today].map(([asset, total]) => (
            <div key={asset} className="flex items-baseline justify-between">
              <dt className="text-dim text-sm">Taken today · {asset}</dt>
              <dd className="text-bright text-sm">{formatStroops(total)}</dd>
            </div>
          ))
        )}
        <div className="flex items-baseline justify-between">
          <dt className="text-dim text-sm">Open requests</dt>
          <dd className="text-bright text-sm">{openRequestCount}</dd>
        </div>
      </dl>
    </section>
  )
}
