'use client'

import { AlertTriangle, Clock, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AmountInput } from '@/components/onramp/amount-input'
import { CurrencySelector } from '@/components/onramp/currency-selector'
import { AssetSelector } from '@/components/offramp/asset-selector'
import { formatCurrency, formatNumber } from '@/lib/onramp/formatters'
import { formatRateCountdown, formatUsd } from '@/lib/offramp/formatters'
import type { FiatCurrency } from '@/types/onramp'
import type { OfframpAssetOption } from '@/types/offramp'

interface OfframpCalculatorProps {
  options: OfframpAssetOption[]
  assetId: string
  amountInput: string
  fiatCurrency: FiatCurrency
  rate: number
  rateCountdown: number
  rateUpdatedAt: number
  isRateLoading: boolean
  fiatAmount: number
  usdEquivalent: number
  fees: {
    offrampFee: number
    networkFee: number
    bankFee: number
    totalFees: number
    receiveAmount: number
  }
  errors: {
    amount?: string
    liquidity?: string
    limit?: string
  }
  limits: { min: number; max: number }
  isCalculating: boolean
  isValid: boolean
  lockCountdown: number | null
  onAssetChange: (value: string) => void
  onAmountChange: (value: string) => void
  onMax: () => void
  onFiatChange: (value: FiatCurrency) => void
  onRefreshRate: () => void
  onSubmit: () => void
}

export function OfframpCalculator({
  options,
  assetId,
  amountInput,
  fiatCurrency,
  rate,
  rateCountdown,
  rateUpdatedAt,
  isRateLoading,
  fiatAmount,
  usdEquivalent,
  fees,
  errors,
  limits,
  isCalculating,
  isValid,
  lockCountdown,
  onAssetChange,
  onAmountChange,
  onMax,
  onFiatChange,
  onRefreshRate,
  onSubmit,
}: OfframpCalculatorProps) {
  const selected = options.find((option) => option.id === assetId) || options[0]
  const receiveLabel = formatCurrency(fees.receiveAmount, fiatCurrency)
  const feeLabel = formatCurrency(fees.offrampFee, fiatCurrency)

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-lg">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Asset</h3>
          <AssetSelector options={options} value={assetId} onChange={onAssetChange} />
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Multi-chain support enabled. Select the chain that matches your wallet.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_140px] md:items-end">
          <div>
            <AmountInput
              label="You're Selling"
              value={amountInput}
              onChange={onAmountChange}
              placeholder="0.00"
              error={errors.amount}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-[52px] w-full rounded-xl text-foreground hover:text-foreground/90"
            onClick={onMax}
          >
            Max
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          ≈ {formatUsd(usdEquivalent)} USD equivalent
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">You&apos;ll Receive</label>
            <div className="h-[52px] w-full rounded-xl border border-border bg-muted/10 px-4 py-3 text-2xl font-semibold text-right text-muted-foreground shadow-sm">
              {receiveLabel}
            </div>
            {/* <div className="min-h-[16px]" aria-hidden /> */}
          </div>
          <CurrencySelector
            variant="fiat"
            value={fiatCurrency}
            onChange={(value) => {
              // Ensure value is a fiat currency before calling onFiatChange
              if (typeof value === 'string' || (value && (value as any).symbol)) {
                onFiatChange(value as FiatCurrency)
              }
            }}
            className="md:mt-6"
          />
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Rate</span>
            <span className="font-medium text-foreground">
              1 {selected.asset} = {formatNumber(rate, 2)} {fiatCurrency}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Refresh in</span>
            <span className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> {rateCountdown}s
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Last updated: {new Date(rateUpdatedAt).toLocaleTimeString()}
          </div>
          <button
            type="button"
            onClick={onRefreshRate}
            className="mt-2 inline-flex items-center gap-2 text-xs text-primary"
          >
            {isRateLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Refresh rate
          </button>
        </div>

        {lockCountdown !== null ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-success/10 px-3 py-2 text-xs text-success">
            <Clock className="h-3.5 w-3.5" /> Rate locked for: {formatRateCountdown(lockCountdown)}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Offramp fee (1%)</span>
            <span className="font-medium text-foreground">{feeLabel}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Network fee</span>
            <span className="font-medium text-foreground">
              {formatCurrency(fees.networkFee, fiatCurrency)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Bank transfer fee</span>
            <span className="font-medium text-foreground">FREE</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-foreground">
            <span className="font-medium">Total fees</span>
            <span className="font-semibold">{formatCurrency(fees.totalFees, fiatCurrency)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Limits</span>
            <span>
              Min: {formatCurrency(limits.min, fiatCurrency)} • Max:{' '}
              {formatCurrency(limits.max, fiatCurrency)} / day
            </span>
          </div>
          {fiatAmount > 1000000 ? (
            <div className="mt-2 flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" /> Large withdrawals may take longer for compliance
              review.
            </div>
          ) : null}
        </div>

        {errors.liquidity || errors.limit ? (
          <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <Info className="h-4 w-4" /> {errors.liquidity || errors.limit}
          </div>
        ) : null}

        {isCalculating ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Updating estimate...
          </div>
        ) : null}

        <Button
          size="lg"
          className="w-full rounded-full text-base"
          type="submit"
          disabled={!isValid || isRateLoading}
        >
          Continue to Bank Details →
        </Button>
      </form>
    </div>
  )
}
