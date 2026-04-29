'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { OrderStatus } from '@/types/onramp'

interface ProcessingTestUtilsProps {
  orderId: string
  currentStatus: OrderStatus
  onStatusChange: (status: OrderStatus) => void
}

export function ProcessingTestUtils({
  orderId,
  currentStatus,
  onStatusChange,
}: ProcessingTestUtilsProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const statuses: OrderStatus[] = [
    'created',
    'awaiting_payment',
    'payment_received',
    'minting',
    'transferring',
    'completed',
    'failed',
  ]

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button variant="outline" size="sm" onClick={() => setIsVisible(!isVisible)} className="mb-2">
        {isVisible ? 'Hide' : 'Show'} Test Controls
      </Button>

      {isVisible && (
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Test Controls
              <Badge variant="secondary" className="text-xs">
                DEV ONLY
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Current Status: <span className="font-mono">{currentStatus}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-3">Order: {orderId.slice(-8)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={currentStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onStatusChange(status)}
                  className="text-xs h-8"
                  disabled={currentStatus === status}
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>

            <div className="pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  localStorage.removeItem(`onramp:order:${orderId}`)
                  window.location.reload()
                }}
                className="w-full text-xs h-8"
              >
                Reset Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
