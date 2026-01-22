"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBalanceContext } from "@/contexts/balance-context"

export function EthPriceTicker() {
  const { balances, lastUpdated, refetch } = useBalanceContext()
  const ethBalance = balances.find((b) => b.symbol === "ETH")
  const price = ethBalance?.price
  const loading = ethBalance?.priceLoading ?? false
  const error = ethBalance?.priceError ?? null

  const formatPrice = (value: number | null) => {
    if (value === null) return "—"
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border border-border"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">ETH:</span>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1"
            >
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </motion.div>
          ) : error ? (
            <motion.span
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-red-500"
            >
              Error
            </motion.span>
          ) : (
            <motion.span
              key="price"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-sm font-semibold text-foreground"
            >
              {formatPrice(price)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      
      {lastUpdated && !loading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" />
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        </div>
      )}
      
      <button
        onClick={refetch}
        disabled={loading}
        className={cn(
          "ml-auto p-1 rounded hover:bg-muted transition-colors",
          loading && "opacity-50 cursor-not-allowed"
        )}
        title="Refresh price"
      >
        <RefreshCw className={cn("w-3 h-3 text-muted-foreground", loading && "animate-spin")} />
      </button>
    </motion.div>
  )
}

