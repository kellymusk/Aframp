'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatNumber, truncateAddress } from '@/lib/onramp/formatters'
import type { OnrampOrder } from '@/types/onramp'

interface OrderSummaryCardProps {
  order: OnrampOrder
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  }

  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'bank_transfer':
        return 'Bank Transfer'
      case 'mobile_money':
        return 'Mobile Money'
      case 'card':
        return 'Debit/Credit Card'
      default:
        return method
    }
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Order Summary
          <Badge variant="outline" className="text-xs">
            #{order.id.slice(-8)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transaction Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">You&apos;re buying</span>
            <span className="font-semibold">
              {formatNumber(order.cryptoAmount)} {order.cryptoAsset}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">You&apos;re paying</span>
            <span className="font-semibold">
              {formatCurrency(order.amount, order.fiatCurrency)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Exchange rate</span>
            <span className="text-sm">
              1 {order.cryptoAsset} = {formatCurrency(order.exchangeRate, order.fiatCurrency)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Payment method</span>
            <span className="text-sm">{getPaymentMethodLabel(order.paymentMethod)}</span>
          </div>
        </div>

        <Separator />

        {/* Fee Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Fee Breakdown</h4>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Processing fee</span>
            <span className="text-sm">
              {order.fees.processingFee === 0
                ? 'FREE'
                : formatCurrency(order.fees.processingFee, order.fiatCurrency)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Network fee</span>
            <span className="text-sm">
              {formatCurrency(order.fees.networkFee, order.fiatCurrency)}
            </span>
          </div>

          <div className="flex justify-between items-center font-semibold pt-2 border-t">
            <span className="text-sm">Total fees</span>
            <span className="text-sm">
              {formatCurrency(order.fees.totalFees, order.fiatCurrency)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Wallet Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Destination Wallet</h4>

          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Stellar Address</p>
              <p className="text-sm font-mono truncate">
                {truncateAddress(order.walletAddress, 6)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(order.walletAddress, 'wallet')}
              className="h-8 w-8 p-0"
            >
              {copiedField === 'wallet' ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Order Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Order Information</h4>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm">{formatDate(order.createdAt)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Order ID</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{order.id.slice(-12)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(order.id, 'orderId')}
                className="h-6 w-6 p-0"
              >
                {copiedField === 'orderId' ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {order.completedAt && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="text-sm">{formatDate(order.completedAt)}</span>
            </div>
          )}
        </div>

        {/* Support Information */}
        <div className="mt-6 p-3 bg-muted/20 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@aframp.com" className="text-primary hover:underline">
              support@aframp.com
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
