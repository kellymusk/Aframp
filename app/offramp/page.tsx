import { OfframpPageClient } from '@/components/offramp/offramp-page-client'
import { OfframpWalletGuard } from '@/components/offramp/offramp-wallet-guard'

export default function OfframpPage() {
  return (
    <OfframpWalletGuard>
      <OfframpPageClient />
    </OfframpWalletGuard>
  )
}
