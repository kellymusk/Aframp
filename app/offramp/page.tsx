import { FlowErrorBoundary } from '@/components/error/FlowErrorBoundary'
import { OfframpPageClient } from '@/components/offramp/offramp-page-client'
import { OfframpWalletGuard } from '@/components/offramp/offramp-wallet-guard'

export default function OfframpPage() {
  return (
    <FlowErrorBoundary step="offramp-calculator" restartHref="/offramp">
      <OfframpWalletGuard>
        <OfframpPageClient />
      </OfframpWalletGuard>
    </FlowErrorBoundary>
  )
}
