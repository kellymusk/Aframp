'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useBalanceContext } from '@/contexts/balance-context'
import { cn } from '@/lib/utils'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#f97316']

export function PortfolioPageClient() {
  const { balances, totalUsdValue, loading } = useBalanceContext()

  const assets = balances
    .map((b) => ({
      symbol: b.symbol,
      value: b.price && b.amount ? b.amount * b.price : 0,
      change: b.change ?? 0,
      trend: b.trend,
    }))
    .filter((a) => a.value > 0)

  // Net worth = sum of all asset USD values
  const netWorth = totalUsdValue

  // PnL: weighted average of per-asset 24h change applied to current value
  const totalPnl = assets.reduce((sum, a) => sum + (a.value * a.change) / 100, 0)
  const totalPnlPct = netWorth > 0 ? (totalPnl / netWorth) * 100 : 0
  const pnlPositive = totalPnl >= 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-[1.5rem]" />
          <Skeleton className="h-28 rounded-[1.5rem]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-[1.5rem]" />
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-[1.5rem]" />
            <Skeleton className="h-14 rounded-[1.5rem]" />
            <Skeleton className="h-14 rounded-[1.5rem]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>

      {/* Net Worth + PnL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Net Worth</p>
          <p className="text-3xl font-bold text-foreground">
            ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-1">24h PnL</p>
          <div className="flex items-center gap-2">
            {pnlPositive ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <p className={cn('text-3xl font-bold', pnlPositive ? 'text-green-500' : 'text-red-500')}>
              {pnlPositive ? '+' : ''}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className={cn('text-sm font-medium', pnlPositive ? 'text-green-500' : 'text-red-500')}>
              ({pnlPositive ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          No assets found in this wallet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm font-medium text-muted-foreground mb-4">Asset Breakdown</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={assets}
                  dataKey="value"
                  nameKey="symbol"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {assets.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Asset List */}
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm font-medium text-muted-foreground mb-4">Holdings</p>
            <div className="space-y-3">
              {assets.map((asset, i) => {
                const pct = netWorth > 0 ? (asset.value / netWorth) * 100 : 0
                const positive = asset.change >= 0
                return (
                  <div key={asset.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="font-medium text-foreground">{asset.symbol}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pct.toFixed(1)}%{' '}
                        <span className={positive ? 'text-green-500' : 'text-red-500'}>
                          {positive ? '+' : ''}{asset.change.toFixed(2)}%
                        </span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
