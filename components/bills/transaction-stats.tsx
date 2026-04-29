'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BillsTransaction } from '@/hooks/use-bills-data'

interface TransactionStatsProps {
  transactions: BillsTransaction[]
  loading: boolean
}

export function TransactionStats({ transactions, loading }: TransactionStatsProps) {
  if (loading) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </section>
    )
  }

  const totalSpent = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const pendingCount = transactions.filter((t) => t.status === 'pending').length
  const failedCount = transactions.filter((t) => t.status === 'failed').length

  const stats = [
    {
      title: 'Total Spent',
      value: `₦${totalSpent.toLocaleString()}`,
      change: '+12.5%',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Pending Payments',
      value: pendingCount.toString(),
      change: `${pendingCount} pending`,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Failed Transactions',
      value: failedCount.toString(),
      change: `${failedCount} failed`,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ]

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-border bg-card hover:border-primary/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    stat.title.includes('Spent') && 'bg-green-500/10 text-green-500',
                    stat.title.includes('Pending') && 'bg-yellow-500/10 text-yellow-500',
                    stat.title.includes('Failed') && 'bg-red-500/10 text-red-500'
                  )}
                >
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  )
}
