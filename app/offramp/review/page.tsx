import { StepReview } from '@/components/offramp/step-review'
import { OfframpWalletGuard } from '@/components/offramp/offramp-wallet-guard'

export default function OfframpReviewPage() {
  return (
    <OfframpWalletGuard>
      <StepReview />
    </OfframpWalletGuard>
  )
}
