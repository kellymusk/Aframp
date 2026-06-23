'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import type { BillsTransaction } from '@/hooks/use-bills-data'

interface RecentPaymentsProps {
  transactions: BillsTransaction[]
  loading: boolean
}

const statusStyles: Record<BillsTransaction['status'], string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  failed: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

export function RecentPayments({ transactions, loading }: RecentPaymentsProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <div className="h-4 w-48 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (transactions.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Bill Payments</h2>
        <EmptyState
          variant="bills"
          title="No bill payments yet"
          description="Pay electricity, airtime, TV, and more — your payments will show up here."
          action={{ label: 'Browse bill categories', href: '/bills' }}
          secondaryAction={{
            label: 'Pay a bill',
            href: '/bills/pay',
            variant: 'outline',
          }}
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Bill Payments</h2>
        <Badge variant="secondary" className="text-xs">
          {transactions.length} payment{transactions.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="space-y-3">
        {transactions.map((tx, index) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-border bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{tx.biller}</p>
                  <p className="text-sm text-muted-foreground">{tx.accountLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">
                    ₦{tx.amount.toLocaleString()}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs capitalize', statusStyles[tx.status])}
                  >
                    {tx.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
