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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-white/5 bg-black/20 backdrop-blur-md">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-white/10 rounded animate-pulse"></div>
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
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      glowColor: 'group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]',
    },
    {
      title: 'Pending Payments',
      value: pendingCount.toString(),
      change: `${pendingCount} pending`,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/20',
      glowColor: 'group-hover:shadow-[0_0_30px_-5px_rgba(250,204,21,0.3)]',
    },
    {
      title: 'Failed Transactions',
      value: failedCount.toString(),
      change: `${failedCount} failed`,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
      glowColor: 'group-hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]',
    },
  ]

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
          className="group relative"
        >
          <div className={cn('absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none', stat.glowColor)} />
          <Card className={cn(
            'relative h-full overflow-hidden border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md transition-all duration-300',
            'hover:border-white/10 hover:bg-white/[0.04]',
            stat.glowColor ? 'hover:-translate-y-1' : ''
          )}>
            <div className={cn('absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-20', stat.color)} />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {stat.title}
              </CardTitle>
              <div className={cn('p-2.5 rounded-xl border transition-colors', stat.bgColor, stat.borderColor, 'group-hover:scale-110 duration-300')}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground">
                {stat.value}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 border-none shadow-none',
                    stat.bgColor,
                    stat.color
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
