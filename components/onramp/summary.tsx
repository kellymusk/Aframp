'use client'

import { Button } from '@/components/ui/button'
import { type OnrampOrder } from '@/types/onramp'

interface OnrampSummaryProps {
  order: OnrampOrder
  onContinue: () => void
  onCancel: () => void
  onError: (error: string) => void
}

export function OnrampSummary({ order, onContinue, onCancel }: OnrampSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        <div className="grid gap-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">
              {order.amount.toFixed(2)} {order.fiatCurrency}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Exchange Rate</span>
            <span className="font-semibold">{order.exchangeRate.toFixed(4)}</span>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing Fee (2.5%)</span>
              <span>{order.fees.processingFee.toFixed(2)}</span>
            </div>

            {order.paymentMethod === 'mobile_money' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mobile Money Fee (0.5%)</span>
                <span>{(order.fees.processingFee * 0.2).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Network Fee</span>
              <span>{order.fees.networkFee.toFixed(2)}</span>
            </div>

            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>You Pay</span>
              <span>{order.fees.totalCost.toFixed(2)} {order.fiatCurrency}</span>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-between">
            <span className="text-muted-foreground">You Receive</span>
            <span className="font-semibold text-lg">
              {order.cryptoAmount.toFixed(4)} {order.cryptoAsset}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Payment Method</p>
        <p className="text-sm text-muted-foreground">{formatPaymentMethod(order.paymentMethod)}</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onContinue} className="flex-1">
          Pay Now
        </Button>
      </div>
    </div>
  )
}

function formatPaymentMethod(method: string): string {
  const names: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    card: 'Debit/Credit Card',
    mobile_money: 'Mobile Money (M-Pesa, MTN, Airtel)',
  }
  return names[method] || method
}
