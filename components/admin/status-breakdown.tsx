import { Badge } from '@/components/ui/badge'
import type { StatusCount } from '@/lib/api'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const GOOD_STATUSES = new Set(['confirmed', 'completed', 'paid'])
const BAD_STATUSES = new Set(['failed', 'expired'])

function variantFor(status: string): BadgeVariant {
  if (GOOD_STATUSES.has(status)) return 'default'
  if (BAD_STATUSES.has(status)) return 'destructive'
  return 'secondary'
}

interface StatusBreakdownProps {
  title: string
  items: StatusCount[]
}

/** Count-per-status card for the overview page — payments, withdrawals, payment requests. */
export function StatusBreakdown({ title, items }: StatusBreakdownProps) {
  return (
    <div className="bg-panel border-hairline rounded-2xl border p-5">
      <p className="text-dim text-xs">{title}</p>
      {items.length === 0 ? (
        <p className="text-dim mt-3 text-sm">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.status} className="flex items-center justify-between gap-3">
              <Badge variant={variantFor(item.status)} className="capitalize">
                {item.status}
              </Badge>
              <span className="text-sm font-semibold tabular-nums">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
