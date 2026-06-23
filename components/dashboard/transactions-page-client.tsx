'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { TransactionHistory } from '@/components/dashboard/transaction-history'
import { FilterPanel } from '@/components/transactions/FilterPanel'

export function TransactionsPageClient() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-bold font-cal-sans tracking-tight">Transactions</h1>
              <p className="text-muted-foreground">
                All onramp, offramp, and bill payment activity in one place
              </p>
            </div>
          </div>
          <FilterPanel />
        </div>

        <TransactionHistory />
      </div>
    </DashboardLayout>
  )
}
