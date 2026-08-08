import { FlowErrorBoundary } from '@/components/error/FlowErrorBoundary'
import { OnrampPageClient } from '@/components/onramp/onramp-page-client'

export default function OnrampPage() {
  return (
    <FlowErrorBoundary step="onramp-calculator" restartHref="/onramp">
      <OnrampPageClient />
    </FlowErrorBoundary>
  )
}
