import { Suspense } from 'react'
import { OnrampPaymentClient } from '@/components/onramp/onramp-payment-client'

function OnrampPaymentPageContent() {
  return <OnrampPaymentClient />
}

export default function OnrampPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <OnrampPaymentPageContent />
    </Suspense>
  )
}
