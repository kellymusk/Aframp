'use client'

import { cn } from '@/lib/utils'
import type { TransactionItem } from '@/types/onramp'

const transactions: TransactionItem[] = [
  {
    id: 'tx-1',
    fromAmount: '₦25,000',
    toAmount: '15.58 cNGN',
    status: 'Completed',
    timeLabel: '2 hrs ago',
  },
  {
    id: 'tx-2',
    fromAmount: '₦100,000',
    toAmount: '62.35 cNGN',
    status: 'Pending',
    timeLabel: '5 mins ago',
  },
  {
    id: 'tx-3',
    fromAmount: 'KES 8,000',
    toAmount: '4.12 cKES',
    status: 'Failed',
    timeLabel: 'Yesterday',
  },
]

const statusClass: Record<TransactionItem['status'], string> = {
  Completed: 'bg-success/10 text-success',
  Pending: 'bg-warning/15 text-warning',
  Failed: 'bg-destructive/10 text-destructive',
}

export function RecentTransactions() {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Onramp Transactions</h3>
        <button type="button" className="text-sm text-primary hover:text-primary/80">
          View All Transactions
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            <div className="text-sm font-medium text-foreground">
              {tx.fromAmount} → {tx.toAmount}
            </div>
            <span
              className={cn(
                'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold',
                statusClass[tx.status]
              )}
            >
              {tx.status}
            </span>
            <div className="text-xs text-muted-foreground">{tx.timeLabel}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
