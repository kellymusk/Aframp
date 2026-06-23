'use client'

import { useEffect, useState, Suspense } from 'react'
import { VerifyPaymentClient } from '@/components/bills/verify-payment-client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { motion } from 'framer-motion'

function VerifyPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying')
  const [transactionId, setTransactionId] = useState<string | null>(null)


  useEffect(() => {
    const reference = searchParams.get('reference')
    const gateway = searchParams.get('gateway') || 'paystack'

    if (!reference) {
      setStatus('failed')
      return
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/bills/verify?reference=${reference}&gateway=${gateway}`)
        const data = await response.json()

        if (data.success && data.status === 'success') {
          setStatus('success')
          setTransactionId(data.reference)
          
          // Redirect to receipt after 2 seconds
          setTimeout(() => {
            router.push(`/bills/receipt/${data.reference}`)
          }, 2000)

        } else {
          setStatus('failed')
        }
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('failed')
      }
    }

    verifyPayment()
  }, [searchParams, router])

  return (
    <>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Verifying Payment</h1>
                <p className="text-muted-foreground mt-2">
                  Please wait while we confirm your payment...
                </p>
              </div>
            </div>
          </div>
        }
      >
        <VerifyPaymentClient />
      </Suspense>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-6"
      >
      {status === 'verifying' && (
        <>
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Verifying Payment</h1>
            <p className="text-muted-foreground mt-2">
              Please wait while we confirm your payment...
            </p>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-success">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2">
              Your bill payment has been processed successfully.
            </p>
            {transactionId && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Ref: {transactionId}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Redirecting to receipt...
          </p>
        </>
      )}

      {status === 'failed' && (
        <>
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-destructive">Payment Failed</h1>
            <p className="text-muted-foreground mt-2">
              We couldn't verify your payment. Please try again or contact support.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/bills">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </>
      )}
    </motion.div>
    </>
  )
}

export default function VerifyPaymentPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Verifying Payment</h1>
              <p className="text-muted-foreground mt-2">
                Please wait while we load payment details...
              </p>
            </div>
          </div>
        }
      >
        <VerifyPaymentContent />
      </Suspense>
    </div>
  )
}

