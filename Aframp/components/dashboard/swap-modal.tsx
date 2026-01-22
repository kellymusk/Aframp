"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SwapModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SwapModal({ open, onOpenChange }: SwapModalProps) {
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [fromCurrency, setFromCurrency] = useState("cNGN")
  const [toCurrency, setToCurrency] = useState("BTC")
  const [swapping, setSwapping] = useState(false)

  const currencies = ["cNGN", "BTC", "ETH", "XLM", "USDT"]

  const handleSwap = async () => {
    setSwapping(true)
    // Simulate swap
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setSwapping(false)
    onOpenChange(false)
    // Reset form
    setFromAmount("")
    setToAmount("")
  }

  const swapCurrencies = () => {
    const temp = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(temp)
    const tempAmount = fromAmount
    setFromAmount(toAmount)
    setToAmount(tempAmount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Swap Tokens
          </DialogTitle>
          <DialogDescription>
            Exchange your tokens instantly with low fees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* From */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">From</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              Balance: 2,450,000 cNGN
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={swapCurrencies}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowDown className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* To */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">To</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="0.00"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              ≈ $1,650 USD
            </div>
          </div>

          {/* Swap Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span className="text-foreground font-medium">1 cNGN = 0.000001 BTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="text-foreground font-medium">0.1%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">You receive</span>
              <span className="text-foreground font-semibold">
                {toAmount || "0.00"} {toCurrency}
              </span>
            </div>
          </div>

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!fromAmount || !toAmount || swapping}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {swapping ? "Swapping..." : "Swap Tokens"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


