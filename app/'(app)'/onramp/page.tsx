'use client'

import { useEffect, useState, useCallback } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { OnrampForm } from '@/components/onramp/form'
import { OnrampSummary } from '@/components/onramp/summary'
import { OnrampPayment } from '@/components/onramp/payment'
import { type OnrampOrder } from '@/types/onramp'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'aframp_onramp_order'

export default function OnrampPage() {
  const [order, setOrder] = useState<OnrampOrder | null>(null)
  const [step, setStep] = useState<'form' | 'summary' | 'payment'>('form')
  const [error, setError] = useState<string | null>(null)

  // Load persisted order on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as OnrampOrder
        const now = Date.now()
        // Resume if not expired
        if (parsed.expiresAt > now) {
          setOrder(parsed)
          setStep('payment')
        } else {
          // Clear expired order
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const handleOrderCreated = useCallback((newOrder: OnrampOrder) => {
    setOrder(newOrder)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder))
    setStep('summary')
    setError(null)
  }, [])

  const handlePaymentInitiated = useCallback(() => {
    setStep('payment')
  }, [])

  const handleOrderExpired = useCallback(() => {
    setError('Order expired. Please create a new one.')
    setOrder(null)
    localStorage.removeItem(STORAGE_KEY)
    setStep('form')
  }, [])

  const handleOrderCompleted = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setOrder(null)
    setStep('form')
  }, [])

  const handleReset = useCallback(() => {
    setOrder(null)
    setStep('form')
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Buy Crypto</h1>
        <p className="text-muted-foreground">
          {step === 'form' && 'Enter the amount and payment method'}
          {step === 'summary' && 'Review your order details'}
          {step === 'payment' && 'Complete your payment'}
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-start justify-between gap-4">
            <span>{error}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setError(null)}
              className="h-auto p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {step === 'form' && (
        <OnrampForm onOrderCreated={handleOrderCreated} onError={setError} />
      )}

      {step === 'summary' && order && (
        <OnrampSummary
          order={order}
          onContinue={handlePaymentInitiated}
          onCancel={handleReset}
          onError={setError}
        />
      )}

      {step === 'payment' && order && (
        <OnrampPayment
          order={order}
          onCompleted={handleOrderCompleted}
          onExpired={handleOrderExpired}
          onError={setError}
        />
      )}
    </main>
  )
}
