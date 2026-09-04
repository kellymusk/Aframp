'use client'

import Link from 'next/link'
import { ArrowDownToLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sparkline } from '@/components/ui/sparkline'
import { BalanceFigure } from '@/components/wallet/balance-figure'
import type { Balance } from '@/lib/api'

/** Assets with a cash-out path today; XLM has no withdraw flow server-side. */
const CASH_OUTABLE_ASSETS = new Set(['cNGN'])

interface AssetCardsProps {
  balances: Balance[]
  /**
   * 7-day balance history per asset, oldest -> newest, in display units.
   * Optional because the balances API doesn't expose history yet — when it
   * does, pass it through here and the sparkline renders automatically.
   */
  history?: Record<string, number[]>
}

/**
 * Consolidated per-asset view for merchants holding more than one asset
 * (typically XLM + cNGN): each asset gets its own card with available +
 * pending balance, an optional 7-day sparkline, and a cash-out shortcut for
 * assets that support withdrawal.
 */
export function AssetCards({ balances, history }: AssetCardsProps) {
  if (balances.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {balances.map((balance) => {
        const series = history?.[balance.asset]
        const canCashOut = CASH_OUTABLE_ASSETS.has(balance.asset)

        return (
          <div
            key={balance.asset}
            className="bg-panel border-hairline flex flex-col gap-4 rounded-2xl border p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="bg-brand-deep text-pos flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {balance.asset.slice(0, 2)}
              </span>
              {series && series.length >= 2 && (
                <Sparkline data={series} width={72} height={24} className="shrink-0" />
              )}
            </div>

            <BalanceFigure
              asset={balance.asset}
              available={balance.available}
              pending={balance.pending}
              size="sm"
            />

            {canCashOut && (
              <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                <Link href="/withdraw">
                  <ArrowDownToLine className="size-4" aria-hidden />
                  Cash out
                </Link>
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
