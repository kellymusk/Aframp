'use client'

import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { TransactionHistory } from '@/components/dashboard/transaction-history'
import { FilterPanel } from '@/components/transactions/FilterPanel'
import { useWallet } from '@/hooks/useWallet'
import { walletSession } from '@/lib/wallet/session'

export function TransactionsPageClient() {
  const { publicKey } = useWallet()
  const walletAddress = publicKey || walletSession.getAddress() || ''

  return (
    <DashboardLayout walletAddress={walletAddress}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground mt-1">
              Your full transaction history across onramp, offramp, and bill payments.
            </p>
          </div>

          {/* Filter trigger — opens the slide-in FilterPanel */}
          <FilterPanel />
        </div>

        {/* Full transaction history with pagination, sorting, and filtering */}
        <TransactionHistory />
      </div>
    </DashboardLayout>
  )
}
