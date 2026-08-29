'use client'

import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatStroops } from '@/lib/money'

interface BalanceFigureProps {
  asset: string
  available: bigint
  pending: bigint
  /** `lg` for hero figures (home page), `sm` for compact cards. */
  size?: 'lg' | 'sm'
}

/**
 * Shows the available balance as the primary figure and, when there's a
 * nonzero pending amount, a secondary "N pending" line with a tooltip
 * explaining that pending funds are awaiting blockchain confirmations.
 */
export function BalanceFigure({ asset, available, pending, size = 'lg' }: BalanceFigureProps) {
  const amountClass = size === 'lg' ? 'text-4xl' : 'text-xl'

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`${amountClass} font-bold tracking-tight tabular-nums`}>
          {formatStroops(available)}
        </span>
        <span className="text-dim text-base font-medium">{asset}</span>
      </div>

      {pending > 0n && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-dim hover:text-bright mt-1 flex items-center gap-1 text-xs"
              >
                <span>
                  {formatStroops(pending)} {asset} pending
                </span>
                <Info className="size-3" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-56 text-center">
              Pending balance is awaiting blockchain confirmations. Once confirmed, it moves into
              your available balance and can be cashed out.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
