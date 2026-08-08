import { FlowErrorBoundary } from '@/components/error/FlowErrorBoundary'
import { StepReview } from '@/components/offramp/step-review'
import { OfframpWalletGuard } from '@/components/offramp/offramp-wallet-guard'

export default function OfframpReviewPage() {
  return (
    <FlowErrorBoundary step="offramp-review" restartHref="/offramp">
      <OfframpWalletGuard>
        <StepReview />
      </OfframpWalletGuard>
    </FlowErrorBoundary>
  )
}
