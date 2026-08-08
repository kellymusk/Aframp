import { Suspense } from 'react'
import { OnrampPaymentClient } from '@/components/onramp/onramp-payment-client'
import { FlowErrorBoundary } from '@/components/error/FlowErrorBoundary'

function OnrampPaymentPageContent() {
  return (
    <FlowErrorBoundary step="onramp-payment" restartHref="/onramp">
      <OnrampPaymentClient />
    </FlowErrorBoundary>
  )
}

export default function OnrampPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <OnrampPaymentPageContent />
    </Suspense>
  )
}
