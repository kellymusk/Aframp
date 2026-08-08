'use client'

import { FlowErrorBoundary } from '@/components/error/FlowErrorBoundary'
import { OfframpWalletGuard } from '@/components/offramp/offramp-wallet-guard'
import { OfframpBankDetailsClient } from '@/components/offramp/offramp-bank-details-client'

export default function OfframpBankDetailsPage() {
  return (
    <FlowErrorBoundary step="offramp-bank-details" restartHref="/offramp">
      <OfframpWalletGuard>
        <OfframpBankDetailsClient />
      </OfframpWalletGuard>
    </FlowErrorBoundary>
  )
}
