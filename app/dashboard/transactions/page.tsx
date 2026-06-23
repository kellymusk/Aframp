import { Suspense } from 'react'
import { TransactionsPageClient } from '@/components/dashboard/transactions-page-client'

export default function DashboardTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      }
    >
      <TransactionsPageClient />
    </Suspense>
  )
}
