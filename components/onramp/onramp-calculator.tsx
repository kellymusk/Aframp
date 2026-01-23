"use client"

import { Info, Loader2 } from "lucide-react"
import { AmountInput } from "@/components/onramp/amount-input"
import { CurrencySelector } from "@/components/onramp/currency-selector"
import { ExchangeRateDisplay } from "@/components/onramp/exchange-rate-display"
import { PaymentMethodCard } from "@/components/onramp/payment-method-card"
import { WalletDisplay } from "@/components/onramp/wallet-display"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatNumber } from "@/lib/onramp/formatters"
import type { CryptoAsset, FiatCurrency, PaymentMethod } from "@/types/onramp"

interface OnrampCalculatorProps {
  amountInput: string
  fiatCurrency: FiatCurrency
  cryptoAsset: CryptoAsset
  paymentMethod: PaymentMethod
  exchangeRateLabel: string
  exchangeCountdown: number
  exchangeWarning?: string | null
  exchangeError?: string | null
  exchangeLoading?: boolean
  onRefreshRate: () => void
  onAmountChange: (value: string) => void
  onFiatChange: (value: FiatCurrency | CryptoAsset) => void
  onCryptoChange: (value: FiatCurrency | CryptoAsset) => void
  onPaymentChange: (value: PaymentMethod) => void
  onSubmit: () => void
  onCopyWallet: () => void
  onChangeWallet: (address: string) => void
  onDisconnectWallet: () => void
  walletAddress: string
  walletOptions: string[]
  amountError?: string
  limits: { min: number; max: number }
  balanceLabel?: string
  cryptoAmount: number
  isCalculating: boolean
  isValid: boolean
  fees: {
    processingFee: number
    networkFee: number
    totalFees: number
    totalCost: number
  }
}

const paymentOptions: { value: PaymentMethod; icon: string; title: string; description: string }[] = [
  { value: "bank_transfer", icon: "🏦", title: "Bank Transfer", description: "Free, 5-30 mins" },
  { value: "card", icon: "💳", title: "Card Payment", description: "1.5% fee, Instant" },
  { value: "mobile_money", icon: "📱", title: "Mobile Money", description: "0.5% fee, 2-10 mins" },
]

export function OnrampCalculator({
  amountInput,
  fiatCurrency,
  cryptoAsset,
  paymentMethod,
  exchangeRateLabel,
  exchangeCountdown,
  exchangeWarning,
  exchangeError,
  exchangeLoading,
  onRefreshRate,
  onAmountChange,
  onFiatChange,
  onCryptoChange,
  onPaymentChange,
  onSubmit,
  onCopyWallet,
  onChangeWallet,
  onDisconnectWallet,
  walletAddress,
  walletOptions,
  amountError,
  limits,
  balanceLabel,
  cryptoAmount,
  isCalculating,
  isValid,
  fees,
}: OnrampCalculatorProps) {
  const processingFeeLabel =
    paymentMethod === "bank_transfer"
      ? "FREE"
      : paymentMethod === "card"
      ? `${formatCurrency(fees.processingFee, fiatCurrency)} (1.5%)`
      : `${formatCurrency(fees.processingFee, fiatCurrency)} (0.5%)`

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-lg">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-end">
          <AmountInput
            label="You Pay"
            value={amountInput}
            onChange={onAmountChange}
            placeholder="0.00"
            error={amountError}
            autoFocus
          />
          <CurrencySelector
            variant="fiat"
            value={fiatCurrency}
            onChange={onFiatChange}
            className="md:mt-6"
          />
        </div>
        {balanceLabel ? <p className="text-xs text-muted-foreground">{balanceLabel}</p> : null}

        <ExchangeRateDisplay
          displayRate={exchangeRateLabel}
          countdown={exchangeCountdown}
          warning={exchangeWarning}
          error={exchangeError}
          isLoading={exchangeLoading}
          onRefresh={onRefreshRate}
        />

        <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">You Receive (estimated)</label>
            <div className="h-[52px] w-full rounded-xl border border-border bg-muted/10 px-4 py-3 text-2xl font-semibold text-right text-muted-foreground shadow-sm">
              {formatNumber(cryptoAmount, 6)}
            </div>
            {/* <div className="min-h-[16px]" aria-hidden /> */}
          </div>
          <CurrencySelector
            variant="crypto"
            value={cryptoAsset}
            onChange={onCryptoChange}
            className="md:mt-6"
          />
        </div>
        {isCalculating ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Updating estimate...
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary" />
          <span>{cryptoAsset} can be swapped to USDC, XLM or bridged to other chains.</span>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Payment Method</h4>
          <div className="grid gap-3 md:grid-cols-3">
            {paymentOptions.map((option) => (
              <PaymentMethodCard
                key={option.value}
                value={option.value}
                selected={paymentMethod === option.value}
                icon={option.icon}
                title={option.title}
                description={option.description}
                onSelect={onPaymentChange}
              />
            ))}
          </div>
        </div>

        <WalletDisplay
          address={walletAddress}
          addressOptions={walletOptions}
          onCopy={onCopyWallet}
          onChangeWallet={onChangeWallet}
          onDisconnect={onDisconnectWallet}
        />

        <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Processing fee</span>
            <span className="font-medium text-foreground">{processingFeeLabel}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Network fee</span>
            <span className="font-medium text-foreground">{formatCurrency(fees.networkFee, fiatCurrency)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-foreground">
            <span className="font-medium">Total cost</span>
            <span className="font-semibold">{formatCurrency(fees.totalCost, fiatCurrency)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <span>
            Min: {formatCurrency(limits.min, fiatCurrency)} | Max: {formatCurrency(limits.max, fiatCurrency)} per
            transaction
          </span>
        </div>

        <div className="sticky bottom-4 z-10 md:static">
          <Button
            size="lg"
            className="w-full rounded-full text-base"
            disabled={!isValid || exchangeLoading}
            type="submit"
          >
            {exchangeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue to Payment →
          </Button>
        </div>
      </form>
    </div>
  )
}
