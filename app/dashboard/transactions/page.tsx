import { Suspense } from 'react'
import { TransactionsPageClient } from '@/components/dashboard/transactions-page-client'

export const metadata = {
  title: 'Transactions | Aframp',
  description: 'View your full transaction history with filtering and pagination.',
}

function TransactionsPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading transactions…</p>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsPageFallback />}>
      <TransactionsPageClient />
    </Suspense>
  )
}
