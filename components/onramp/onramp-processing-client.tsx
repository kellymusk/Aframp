'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useOrderTracking } from '@/hooks/use-order-tracking'
import { useOrderStatusUpdates } from '@/hooks/use-order-status-updates'
import { StatusTimeline } from '@/components/onramp/status-timeline'
import { OrderSummaryCard } from '@/components/onramp/order-summary-card'
import { TransactionDetails } from '@/components/onramp/transaction-details'
import { ProcessingTestUtils } from '@/components/onramp/processing-test-utils'
import { formatCurrency, formatNumber } from '@/lib/onramp/formatters'

interface OnrampProcessingClientProps {
  orderId: string
}

const STATUS_MESSAGES = {
  created: 'Order created, awaiting payment confirmation',
  awaiting_payment: 'Waiting for payment confirmation',
  payment_received: 'Payment confirmed! Converting to crypto',
  minting: 'Minting stablecoin on Stellar network',
  transferring: 'Transferring to your wallet',
  completed: 'Transaction completed successfully!',
  failed: 'Transaction failed. Please contact support.',
} as const

const STATUS_PROGRESS = {
  created: 10,
  awaiting_payment: 20,
  payment_received: 40,
  minting: 70,
  transferring: 90,
  completed: 100,
  failed: 0,
} as const

export function OnrampProcessingClient({ orderId }: OnrampProcessingClientProps) {
  const router = useRouter()
  const { order, loading, error, updateOrderStatus } = useOrderTracking(orderId)

  // Custom hook for real-time status updates
  useOrderStatusUpdates(orderId, updateOrderStatus)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-full bg-muted" />
            <div className="h-64 rounded-3xl bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Order Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                {error || 'The order you&apos;re looking for doesn&apos;t exist.'}
              </p>
              <Button onClick={() => router.push('/onramp')} className="w-full">
                Start New Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const progress = STATUS_PROGRESS[order.status]
  const isCompleted = order.status === 'completed'
  const isFailed = order.status === 'failed'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/onramp')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">Transaction Status</h1>
              <p className="text-sm text-muted-foreground">Order #{orderId.slice(-8)}</p>
            </div>
          </div>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base">A</span>
            </div>
            <span className="font-semibold text-foreground text-lg hidden sm:inline">Aframp</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Status Overview */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={isCompleted ? 'default' : isFailed ? 'destructive' : 'secondary'}
                    className="px-3 py-1"
                  >
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {!isCompleted && !isFailed && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-lg font-semibold">{progress}%</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Progress value={progress} className="h-3" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {STATUS_MESSAGES[order.status]}
                </p>
              </div>

              {/* Transaction Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">You&apos;re buying</p>
                  <p className="font-semibold">
                    {formatNumber(order.cryptoAmount)} {order.cryptoAsset}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">You&apos;re paying</p>
                  <p className="font-semibold">
                    {formatCurrency(order.amount, order.fiatCurrency)}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-sm text-muted-foreground">Exchange rate</p>
                  <p className="font-semibold">
                    1 {order.cryptoAsset} = {formatCurrency(order.exchangeRate, order.fiatCurrency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Status Timeline */}
            <div className="space-y-6 order-2 lg:order-1">
              <StatusTimeline order={order} currentStatus={order.status} />

              {/* Transaction Details */}
              <TransactionDetails order={order} />
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-6 order-1 lg:order-2">
              <div className="sticky top-24 space-y-6">
                <OrderSummaryCard order={order} />

                {/* Success page button - shows when transaction is complete */}
                {isCompleted && (
                  <Button
                    onClick={() => router.push(`/onramp/success?order=${orderId}`)}
                    className="w-full"
                  >
                    View Receipt
                  </Button>
                )}
              </div>

              {/* Failed state actions */}
              {isFailed && (
                <div className="space-y-3">
                  <Button onClick={() => router.push('/onramp')} className="w-full">
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open('mailto:support@aframp.com', '_blank')}
                    className="w-full"
                  >
                    Contact Support
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Test Utils - Development Only */}
      <ProcessingTestUtils
        orderId={orderId}
        currentStatus={order.status}
        onStatusChange={(status) => updateOrderStatus(status)}
      />
    </div>
  )
}
