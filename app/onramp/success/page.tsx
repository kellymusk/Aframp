import { Suspense } from 'react'
import { OnrampSuccessClient } from '@/components/onramp/onramp-success-client'
import { FlowErrorBoundary } from '@/components/error/FlowErrorBoundary'

function OnrampSuccessPageContent() {
  return (
    <FlowErrorBoundary step="onramp-success" restartHref="/onramp">
      <OnrampSuccessClient />
    </FlowErrorBoundary>
  )
}

export default function OnrampSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <OnrampSuccessPageContent />
    </Suspense>
  )
}
