'use client'

import { RefreshCcw, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sparkline } from '@/components/ui/sparkline'

interface ExchangeRateDisplayProps {
  displayRate: string
  countdown: number
  warning?: string | null
  error?: string | null
  isLoading?: boolean
  onRefresh: () => void
  /** Recent rate values for the sparkline (oldest → newest) */
  sparkline?: number[]
}

export function ExchangeRateDisplay({
  displayRate,
  countdown,
  warning,
  error,
  isLoading,
  onRefresh,
  sparkline = [],
}: ExchangeRateDisplayProps) {
  const countdownColor =
    countdown <= 9 ? 'text-destructive' : countdown <= 19 ? 'text-warning' : 'text-success'

  const trend =
    sparkline.length >= 2 ? sparkline[sparkline.length - 1] - sparkline[0] : 0

  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  const trendColor = trend >= 0 ? 'text-success' : 'text-destructive'

  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
          <span>{displayRate || 'Fetching live rates...'}</span>
        </div>
        {sparkline.length >= 2 && (
          <Sparkline data={sparkline} width={80} height={28} />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <div className={cn('text-xs font-semibold', countdownColor)} aria-live="polite">
          {countdown > 0 ? `Updates in ${countdown}s` : 'Refreshing...'}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          aria-label="Refresh exchange rate"
        >
          <RefreshCcw className={cn('h-3 w-3', isLoading ? 'animate-spin' : '')} />
          Refresh
        </button>
      </div>
      {(warning || error) && (
        <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          {warning || error}
        </div>
      )}
    </div>
  )
}
