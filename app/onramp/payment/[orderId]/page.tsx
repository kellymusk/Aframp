'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  PaymentStatusTracker,
  type PaymentStatus,
} from '@/components/onramp/payment-status-tracker'
import { VirtualAccountDisplay } from '@/components/onramp/virtual-account-display'
import { PaymentInstructions } from '@/components/onramp/payment-instructions'
import { CountdownTimer } from '@/components/onramp/countdown-timer'
import { OrderSummary } from '@/components/onramp/order-summary'

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [isPolling, setIsPolling] = useState(true)

  // Mock order data - In production, this would come from an API
  const order = {
    id: orderId,
    status: 'pending' as PaymentStatus,
    fiatAmount: '50,000.00',
    fiatAmountRaw: 50000,
    fiatCurrency: 'NGN',
    cryptoAmount: '31.17',
    cryptoCurrency: 'cNGN',
    exchangeRate: '1 cNGN = 1,604.11 NGN',
    fee: 'Free',
    paymentMethod: 'Bank Transfer',
    walletAddress: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGWK7GBLCMQLIBER4BKXVWBW',
    virtualAccount: {
      bankName: 'Providus Bank',
      accountNumber: '9876543210',
      accountName: 'AFRAMP-USER-12345',
      amount: '₦50,000.00',
      amountRaw: 50000,
      reference: orderId,
      currency: 'NGN',
    },
    expiresAt: new Date(new Date().getTime() + 30 * 60 * 1000), // 30 minutes from now
    createdAt: new Date(),
  }

  // Simulate payment detection polling
  useEffect(() => {
    if (!isPolling || paymentStatus === 'confirmed' || paymentStatus === 'expired') {
      return
    }

    const pollInterval = setInterval(() => {
      // In production, this would call an API to check payment status
      // For demo, we'll simulate a random status change after some time
      const elapsedTime = Date.now() - order.createdAt.getTime()

      // Simulate payment detection after 15 seconds for demo purposes
      if (elapsedTime > 15000 && paymentStatus === 'pending') {
        setPaymentStatus('detecting')
      }

      // Simulate confirmation after 20 seconds
      if (elapsedTime > 20000 && paymentStatus === 'detecting') {
        setPaymentStatus('confirmed')
        setIsPolling(false)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [isPolling, paymentStatus, order.createdAt, orderId, router])

  const handleExpire = useCallback(() => {
    setPaymentStatus('expired')
    setIsPolling(false)
  }, [])

  const handleCancelOrder = () => {
    // In production, this would call an API to cancel the order
    router.push('/onramp')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link
            href="/onramp"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Order #{orderId}</span>
          </div>
          <CountdownTimer expiresAt={order.expiresAt} onExpire={handleExpire} />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Order Summary */}
        <OrderSummary
          fiatAmount={`₦${order.fiatAmount}`}
          fiatCurrency={order.fiatCurrency}
          cryptoAmount={order.cryptoAmount}
          cryptoCurrency={order.cryptoCurrency}
          exchangeRate={order.exchangeRate}
          fee={order.fee}
          paymentMethod={order.paymentMethod}
          walletAddress={order.walletAddress}
        />

        {/* Payment Status */}
        <PaymentStatusTracker status={paymentStatus} />

        {/* Virtual Account Details */}
        {paymentStatus !== 'confirmed' && paymentStatus !== 'expired' && (
          <Card>
            <CardContent className="pt-6">
              <VirtualAccountDisplay account={order.virtualAccount} />
            </CardContent>
          </Card>
        )}

        {/* Payment Instructions */}
        {paymentStatus === 'pending' && (
          <Card>
            <CardContent className="pt-6">
              <PaymentInstructions
                amount={order.virtualAccount.amount}
                reference={order.virtualAccount.reference}
                expiresIn={30}
              />
            </CardContent>
          </Card>
        )}

        {/* Confirmed State */}
        {paymentStatus === 'confirmed' && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="pt-6 text-center">
              <div className="rounded-full bg-success/10 p-4 w-fit mx-auto mb-4">
                <svg
                  className="h-8 w-8 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Payment Received!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your crypto will be minted and sent to your wallet shortly.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Expired State */}
        {paymentStatus === 'expired' && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Payment Session Expired
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your payment session has expired. Please create a new order to continue.
              </p>
              <Button onClick={() => router.push('/onramp')} className="w-full">
                Create New Order
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {paymentStatus === 'pending' && (
          <div className="flex flex-col gap-3">
            <Button variant="outline" className="w-full bg-transparent" asChild>
              <a
                href="https://aframp.vercel.app/help/payment-issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Having issues?
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleCancelOrder}
            >
              Cancel Order
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <p className="text-center text-xs text-muted-foreground">
            Secured by AFRAMP. Your funds are protected with bank-grade encryption.
          </p>
        </div>
      </footer>
    </div>
  )
}
