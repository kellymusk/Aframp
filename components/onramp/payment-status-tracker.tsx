'use client'

import { useEffect, useState } from 'react'
import { Check, Clock, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PaymentStatus = 'pending' | 'detecting' | 'confirmed' | 'failed' | 'expired'

interface PaymentStatusTrackerProps {
  status: PaymentStatus
  onStatusChange?: (status: PaymentStatus) => void
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Waiting for payment',
    description: 'Complete your bank transfer to proceed',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  detecting: {
    icon: Loader2,
    label: 'Detecting payment',
    description: 'We found your payment, verifying...',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  confirmed: {
    icon: Check,
    label: 'Payment confirmed',
    description: 'Your payment has been verified',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  failed: {
    icon: AlertCircle,
    label: 'Payment failed',
    description: 'Something went wrong with your payment',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  expired: {
    icon: AlertCircle,
    label: 'Payment expired',
    description: 'This payment session has expired',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
}

export function PaymentStatusTracker({ status }: PaymentStatusTrackerProps) {
  const [dots, setDots] = useState('')
  const config = statusConfig[status]
  const Icon = config.icon

  useEffect(() => {
    if (status === 'pending' || status === 'detecting') {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [status])

  return (
    <div className={cn('rounded-lg p-4', config.bgColor)}>
      <div className="flex items-center gap-3">
        <div className={cn('rounded-full p-2', config.bgColor)}>
          <Icon
            className={cn(
              'h-5 w-5',
              config.color,
              (status === 'pending' || status === 'detecting') && 'animate-spin'
            )}
          />
        </div>
        <div className="flex-1">
          <p className={cn('font-medium', config.color)}>
            {config.label}
            {(status === 'pending' || status === 'detecting') && dots}
          </p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>
    </div>
  )
}
