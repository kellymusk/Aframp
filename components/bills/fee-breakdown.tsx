'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FeeBreakdownProps {
  amount: number
  baseFee: number
  percentageFee: number
  currency?: string
}

export function FeeBreakdown({
  amount,
  baseFee,
  percentageFee,
  currency = '₦',
}: FeeBreakdownProps) {
  const calcPercentageFee = amount * percentageFee
  const totalFee = baseFee + calcPercentageFee
  const totalAmount = amount + totalFee

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">
          {currency}
          {amount.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <span>Processing Fee</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Flat fee: {currency}
                  {baseFee}
                </p>
                {percentageFee > 0 && <p>Processing: {(percentageFee * 100).toFixed(1)}%</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-muted-foreground">
          {currency}
          {totalFee.toLocaleString()}
        </span>
      </div>
      <div className="pt-2 mt-2 border-t border-border flex justify-between items-center">
        <span className="font-semibold text-foreground">Total to Pay</span>
        <span className="text-lg font-bold text-primary">
          {currency}
          {totalAmount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
