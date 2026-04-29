'use client'

import { OfframpWalletGuard } from '@/components/offramp/offramp-wallet-guard'
import { OfframpBankDetailsClient } from '@/components/offramp/offramp-bank-details-client'

export default function OfframpBankDetailsPage() {
  return (
    <OfframpWalletGuard>
      <OfframpBankDetailsClient />
    </OfframpWalletGuard>
  )
}
