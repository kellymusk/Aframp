import { Suspense } from 'react'
import { OnrampSuccessClient } from '@/components/onramp/onramp-success-client'

function OnrampSuccessPageContent() {
  return <OnrampSuccessClient />
}

export default function OnrampSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <OnrampSuccessPageContent />
    </Suspense>
  )
}
