"use client"

import { RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExchangeRateDisplayProps {
  displayRate: string
  countdown: number
  warning?: string | null
  error?: string | null
  isLoading?: boolean
  onRefresh: () => void
}

export function ExchangeRateDisplay({
  displayRate,
  countdown,
  warning,
  error,
  isLoading,
  onRefresh,
}: ExchangeRateDisplayProps) {
  const countdownColor = countdown <= 9 ? "text-destructive" : countdown <= 19 ? "text-warning" : "text-success"

  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-center">
      <div className="text-sm font-medium text-muted-foreground">⬇️ {displayRate || "Fetching live rates..."}</div>
      <div className={cn("mt-1 text-xs font-semibold", countdownColor)} aria-live="polite">
        Rate updates in: {countdown}s
      </div>
      {(warning || error) && (
        <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          {warning || error}
        </div>
      )}
      <button
        type="button"
        onClick={onRefresh}
        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
      >
        <RefreshCcw className={cn("h-3 w-3", isLoading ? "animate-spin" : "")} />
        Refresh rate
      </button>
    </div>
  )
}
