'use client'

import { CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OnrampOrder, OrderStatus } from '@/types/onramp'

interface StatusTimelineProps {
  order: OnrampOrder
  currentStatus: OrderStatus
}

interface TimelineStep {
  status: OrderStatus
  title: string
  description: string
  timestamp?: number
  transactionHash?: string
  estimatedTime?: string
  isActive: boolean
  isCompleted: boolean
  isFailed: boolean
}

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/public/tx'

export function StatusTimeline({ order, currentStatus }: StatusTimelineProps) {
  const getTimestamp = (status: OrderStatus): number | undefined => {
    switch (status) {
      case 'created':
        return order.createdAt
      case 'payment_received':
        return order.createdAt + 2 * 60 * 1000 // Mock: 2 minutes after creation
      case 'minting':
        return order.createdAt + 3 * 60 * 1000 // Mock: 3 minutes after creation
      case 'transferring':
        return order.createdAt + 5 * 60 * 1000 // Mock: 5 minutes after creation
      case 'completed':
        return order.completedAt || order.createdAt + 7 * 60 * 1000
      default:
        return undefined
    }
  }

  const getEstimatedTime = (status: OrderStatus): string => {
    switch (status) {
      case 'awaiting_payment':
        return 'Usually within 5 minutes'
      case 'payment_received':
        return 'Processing...'
      case 'minting':
        return 'Est. 2 minutes'
      case 'transferring':
        return 'Est. 30 seconds'
      case 'completed':
        return 'Complete'
      default:
        return ''
    }
  }

  const isStatusCompleted = (status: OrderStatus): boolean => {
    const statusOrder: OrderStatus[] = [
      'created',
      'awaiting_payment',
      'payment_received',
      'minting',
      'transferring',
      'completed',
    ]

    const currentIndex = statusOrder.indexOf(currentStatus)
    const stepIndex = statusOrder.indexOf(status)

    return currentIndex > stepIndex || (currentIndex === stepIndex && currentStatus === 'completed')
  }

  const isStatusActive = (status: OrderStatus): boolean => {
    return currentStatus === status && currentStatus !== 'completed' && currentStatus !== 'failed'
  }

  const steps: TimelineStep[] = [
    {
      status: 'payment_received',
      title: 'Payment Received',
      description: `${order.fiatCurrency} ${order.amount.toLocaleString()} confirmed`,
      timestamp: getTimestamp('payment_received'),
      estimatedTime: getEstimatedTime('payment_received'),
      isActive: isStatusActive('payment_received'),
      isCompleted: isStatusCompleted('payment_received'),
      isFailed: currentStatus === 'failed',
    },
    {
      status: 'minting',
      title: 'Converting to Crypto',
      description: `Minting ${order.cryptoAmount.toFixed(2)} ${order.cryptoAsset} on Stellar`,
      timestamp: getTimestamp('minting'),
      estimatedTime: getEstimatedTime('minting'),
      isActive: isStatusActive('minting'),
      isCompleted: isStatusCompleted('minting'),
      isFailed: currentStatus === 'failed',
    },
    {
      status: 'transferring',
      title: 'Transferring to Wallet',
      description: `Sending to ${order.walletAddress.slice(0, 8)}...${order.walletAddress.slice(-8)}`,
      timestamp: getTimestamp('transferring'),
      transactionHash: order.transactionHash,
      estimatedTime: getEstimatedTime('transferring'),
      isActive: isStatusActive('transferring'),
      isCompleted: isStatusCompleted('transferring'),
      isFailed: currentStatus === 'failed',
    },
    {
      status: 'completed',
      title: 'Transaction Complete',
      description: 'Your crypto has been successfully delivered!',
      timestamp: getTimestamp('completed'),
      transactionHash: order.transactionHash,
      estimatedTime: getEstimatedTime('completed'),
      isActive: false,
      isCompleted: currentStatus === 'completed',
      isFailed: currentStatus === 'failed',
    },
  ]

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Transaction Progress
          {currentStatus !== 'completed' && currentStatus !== 'failed' && (
            <Badge variant="secondary" className="animate-pulse">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.status} className="flex gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                    step.isCompleted
                      ? 'border-success bg-success text-success-foreground'
                      : step.isActive
                        ? 'border-primary bg-primary text-primary-foreground animate-pulse'
                        : step.isFailed
                          ? 'border-destructive bg-destructive text-destructive-foreground'
                          : 'border-muted bg-background text-muted-foreground'
                  )}
                >
                  {step.isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : step.isActive ? (
                    <Clock className="h-5 w-5" />
                  ) : step.isFailed ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-current" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mt-2 h-12 w-0.5 transition-all',
                      step.isCompleted ? 'bg-success' : step.isActive ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      'font-semibold',
                      step.isCompleted
                        ? 'text-success'
                        : step.isActive
                          ? 'text-primary'
                          : step.isFailed
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </h3>
                  {step.timestamp && (
                    <span className="text-sm text-muted-foreground">
                      {formatTimestamp(step.timestamp)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{step.description}</p>

                {step.estimatedTime && !step.isCompleted && (
                  <p className="text-xs text-muted-foreground">{step.estimatedTime}</p>
                )}

                {step.transactionHash && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(`${STELLAR_EXPLORER_BASE}/${step.transactionHash}`, '_blank')
                      }
                      className="h-8 text-xs"
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View on Stellar Explorer
                    </Button>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {step.transactionHash.slice(0, 8)}...{step.transactionHash.slice(-8)}
                    </code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
