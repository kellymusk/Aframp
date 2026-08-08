import { Suspense } from 'react'
import { WalletsPageClient } from '@/components/dashboard/wallets-page-client'

export const metadata = {
  title: 'Wallets | Aframp',
  description: 'Manage your connected custodial and external wallets.',
}

function WalletsPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading wallets…</p>
      </div>
    </div>
  )
}

export default function WalletsPage() {
  return (
    <Suspense fallback={<WalletsPageFallback />}>
      <WalletsPageClient />
    </Suspense>
  )
}
