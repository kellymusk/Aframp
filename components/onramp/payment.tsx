'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { type OnrampOrder } from '@/types/onramp'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { CountdownTimer } from './countdown-timer'

interface OnrampPaymentProps {
  order: OnrampOrder
  onCompleted: () => void
  onExpired: () => void
  onError: (error: string) => void
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void
      }
    }
    FlutterwaveCheckout?: (config: FlutterwaveConfig) => void
  }
}

interface PaystackConfig {
  key: string
  email: string
  amount: number
  ref: string
  onClose: () => void
  callback: (response: { reference: string }) => void
}

interface FlutterwaveConfig {
  public_key: string
  tx_ref: string
  amount: number
  currency: string
  payment_options: string
  customer: {
    email: string
    name: string
  }
  customizations: {
    title: string
    description: string
  }
  callback: (response: FlutterwaveResponse) => void
  onclose: () => void
}

interface FlutterwaveResponse {
  status: string
  transaction_id: string
}

export function OnrampPayment({
  order,
  onCompleted,
  onExpired,
  onError,
}: OnrampPaymentProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'pending' | 'processing' | 'success' | 'error'>('pending')
  const [pollCount, setPollCount] = useState(0)

  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
  const flutterwavePublicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY

  useEffect(() => {
    // Load Paystack script
    if (order.paymentMethod === 'card' || order.paymentMethod === 'mobile_money') {
      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.head.appendChild(script)
      return () => document.head.removeChild(script)
    }

    // Load Flutterwave script
    if (order.paymentMethod === 'mobile_money') {
      const script = document.createElement('script')
      script.src = 'https://checkout.flutterwave.com/v3.js'
      script.async = true
      document.head.appendChild(script)
      return () => document.head.removeChild(script)
    }
  }, [order.paymentMethod])

  const pollOrderStatus = async () => {
    // Mock status polling - replace with real API call
    const newCount = pollCount + 1
    setPollCount(newCount)

    if (newCount >= 6) {
      // Assume success after several polls
      setStatus('success')
      onCompleted()
    }
  }

  useEffect(() => {
    if (status === 'processing') {
      const timer = setTimeout(pollOrderStatus, 3000)
      return () => clearTimeout(timer)
    }
  }, [status, pollCount])

  const handlePaystackPayment = async () => {
    if (!paystackPublicKey) {
      onError('Paystack configuration missing')
      return
    }

    if (!window.PaystackPop) {
      onError('Paystack is not available')
      return
    }

    setLoading(true)
    setStatus('processing')

    try {
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: 'user@example.com', // Should come from authenticated session
        amount: Math.round(order.fees.totalCost * 100),
        ref: `${order.id}_${Date.now()}`,
        onClose: () => {
          setLoading(false)
          onError('Payment cancelled')
        },
        callback: async (response) => {
          // Verify payment with backend
          try {
            await verifyPaystackPayment(response.reference, order.id)
            setStatus('success')
            onCompleted()
          } catch {
            setStatus('error')
            onError('Payment verification failed')
          } finally {
            setLoading(false)
          }
        },
      })
      handler.openIframe()
    } catch (cause) {
      setLoading(false)
      onError(cause instanceof Error ? cause.message : 'Payment failed')
    }
  }

  const handleFlutterwavePayment = async () => {
    if (!flutterwavePublicKey) {
      onError('Flutterwave configuration missing')
      return
    }

    if (!window.FlutterwaveCheckout) {
      onError('Flutterwave is not available')
      return
    }

    setLoading(true)
    setStatus('processing')

    const currencyMap: Record<string, string> = {
      NGN: 'NGN',
      KES: 'KES',
      GHS: 'GHS',
      ZAR: 'ZAR',
      UGX: 'UGX',
    }

    window.FlutterwaveCheckout({
      public_key: flutterwavePublicKey,
      tx_ref: `${order.id}_${Date.now()}`,
      amount: order.fees.totalCost,
      currency: currencyMap[order.fiatCurrency] || order.fiatCurrency,
      payment_options: 'mobilemoney,card',
      customer: {
        email: 'user@example.com',
        name: 'User',
      },
      customizations: {
        title: 'Buy Crypto',
        description: `Buy ${order.cryptoAmount} ${order.cryptoAsset}`,
      },
      callback: async (response) => {
        if (response.status === 'successful') {
          try {
            await verifyFlutterwavePayment(response.transaction_id, order.id)
            setStatus('success')
            onCompleted()
          } catch {
            setStatus('error')
            onError('Payment verification failed')
          }
        } else {
          setStatus('error')
          onError('Payment was not successful')
        }
        setLoading(false)
      },
      onclose: () => {
        setLoading(false)
      },
    })
  }

  const handlePaymentClick = () => {
    if (order.paymentMethod === 'card') {
      handlePaystackPayment()
    } else if (order.paymentMethod === 'mobile_money') {
      handleFlutterwavePayment()
    }
  }

  if (status === 'success') {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold">Payment Successful</h2>
        <p className="text-muted-foreground">
          You will receive {order.cryptoAmount.toFixed(4)} {order.cryptoAsset} shortly
        </p>
        <Button onClick={onCompleted} className="w-full">
          Done
        </Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payment Failed</AlertTitle>
        <AlertDescription>
          Your payment could not be processed. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <CountdownTimer
        expiresAt={new Date(order.expiresAt)}
        onExpire={onExpired}
      />

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
        <p className="text-3xl font-bold">
          {order.fees.totalCost.toFixed(2)} {order.fiatCurrency}
        </p>
      </div>

      {status === 'processing' && (
        <Alert>
          <LoadingSpinner className="h-4 w-4" />
          <AlertTitle>Processing</AlertTitle>
          <AlertDescription>Please wait while we confirm your payment...</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handlePaymentClick}
        disabled={loading || status === 'processing'}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            {order.paymentMethod === 'card' ? 'Opening Paystack...' : 'Opening Flutterwave...'}
          </>
        ) : status === 'processing' ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Confirming payment...
          </>
        ) : (
          `Pay with ${order.paymentMethod === 'card' ? 'Paystack' : 'Flutterwave'}`
        )}
      </Button>
    </div>
  )
}

async function verifyPaystackPayment(reference: string, orderId: string): Promise<void> {
  // Mock verification - replace with real API call to backend
  const response = await fetch(`/api/verify-paystack`, {
    method: 'POST',
    body: JSON.stringify({ reference, orderId }),
  })

  if (!response.ok) {
    throw new Error('Payment verification failed')
  }
}

async function verifyFlutterwavePayment(transactionId: string, orderId: string): Promise<void> {
  // Mock verification - replace with real API call to backend
  const response = await fetch(`/api/verify-flutterwave`, {
    method: 'POST',
    body: JSON.stringify({ transactionId, orderId }),
  })

  if (!response.ok) {
    throw new Error('Payment verification failed')
  }
}
