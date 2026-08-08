'use client'

import { formatCurrency } from '@/lib/calculations'
import {
  getAppliedReferralCode,
  isReferralDiscountConsumed,
} from '@/lib/referral'
import type { FiatCurrency, PaymentMethod } from '@/types/onramp'

interface OnrampFeeSummaryProps {
  fees: {
    processingFee: number
    networkFee: number
    totalFees: number
    totalCost: number
  }
  fiatCurrency: FiatCurrency
  paymentMethod: PaymentMethod
  /** Render a referral-programme link below the summary (default: false). */
  showReferralLink?: boolean
}

/**
 * Renders a breakdown of onramp fees (processing fee, network fee, referral
 * discount, and total cost).  Extracted as a single source-of-truth component
 * so the same summary can be placed in the sidebar on desktop and inline on
 * mobile without duplicating logic. (#295)
 */
export function OnrampFeeSummary({
  fees,
  fiatCurrency,
  paymentMethod,
  showReferralLink = false,
}: OnrampFeeSummaryProps) {
  const processingFeeLabel =
    paymentMethod === 'bank_transfer'
      ? 'FREE'
      : paymentMethod === 'card'
        ? `${formatCurrency(fees.processingFee, fiatCurrency)} (1.5%)`
        : `${formatCurrency(fees.processingFee, fiatCurrency)} (0.5%)`

  const hasReferralDiscount =
    !isReferralDiscountConsumed() && Boolean(getAppliedReferralCode())

  const discountedTotalCost = hasReferralDiscount
    ? fees.totalCost - fees.totalFees * 0.1
    : fees.totalCost

  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <div className="flex items-center justify-between">
        <span>Processing fee</span>
        <span className="text-foreground">{processingFeeLabel}</span>
      </div>

      <div className="flex items-center justify-between">
        <span>Network fee</span>
        <span className="text-foreground">
          {formatCurrency(fees.networkFee, fiatCurrency)}
        </span>
      </div>

      {hasReferralDiscount && (
        <div className="flex items-center justify-between text-green-600 dark:text-green-400">
          <span>Referral discount (10%)</span>
          <span>−{formatCurrency(fees.totalFees * 0.1, fiatCurrency)}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-foreground">
        <span>Total cost</span>
        <span className="font-semibold">
          {formatCurrency(discountedTotalCost, fiatCurrency)}
        </span>
      </div>

      {showReferralLink && (
        <a
          href="/referral"
          className="mt-1 block text-xs text-primary hover:underline"
        >
          🎁 Refer a friend → they get 10% off their first ramp
        </a>
      )}
    </div>
  )
}
