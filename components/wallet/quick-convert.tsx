import { memo } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'

import type { PaymentRequest } from '@/lib/api'
import { formatStroops } from '@/lib/money'

export const QuickConvert = memo(function QuickConvert({
  openRequests,
}: {
  openRequests: PaymentRequest[]
}) {
  return (
    <section className="bg-panel border-hairline rounded-2xl border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dim text-xs">Pending</p>
          <h2 className="text-lg font-bold tracking-tight text-white">Waiting to be paid</h2>
        </div>
      </div>

      {openRequests.length === 0 ? (
        <p className="text-dim mt-5 text-sm">No open charges right now.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {openRequests.slice(0, 5).map((request) => (
            <li key={request.id}>
              <Link
                href={`/request/${request.id}`}
                className="hover:bg-raised/60 flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <Clock className="text-dim size-3.5" aria-hidden />
                  {formatStroops(request.amount_stroops)} {request.asset}
                </span>
                <ArrowRight className="text-dim size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/charge"
        className="from-cta-from to-cta-to mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        New charge
        <ArrowRight className="size-4" strokeWidth={2.5} />
      </Link>
    </section>
  )
})
