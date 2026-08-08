'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TokenBalance } from '@/types/balance'

interface BalanceCardProps {
  balance: TokenBalance
  loading?: boolean
}

export function BalanceCard({ balance, loading = false }: BalanceCardProps) {
  const { symbol, amount, price, priceLoading, priceError, change, trend } = balance

  // Format amount with appropriate decimals
  const formatAmount = (value: number, symbol: string) => {
    if (symbol === 'cNGN') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })
  }

  // Calculate USD value
  const usdValue = price && amount ? amount * price : null
  const displayUsdValue = usdValue
    ? `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : priceError
      ? 'Error'
      : '—'

  // Format change percentage
  const displayChange =
    change !== undefined ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : null

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 border border-border shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-medium">{symbol}</span>
        <div className="flex items-center gap-2">
          {!priceLoading && trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
          {!priceLoading && trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          {priceLoading && <Skeleton className="h-4 w-10" />}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-2xl font-bold text-foreground">
          {formatAmount(amount, symbol)}
        </h3>
        {priceLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={cn('text-sm', priceError ? 'text-red-500' : 'text-muted-foreground')}>
              {displayUsdValue}
            </span>
            {displayChange && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend === 'up'
                    ? 'text-green-500'
                    : trend === 'down'
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                )}
              >
                {displayChange}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
