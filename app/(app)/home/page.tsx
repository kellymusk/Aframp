'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { ActivityHighlights } from '@/components/wallet/activity-highlights'
import { BalanceFigure } from '@/components/wallet/balance-figure'
import { QuickActions } from '@/components/wallet/quick-actions'
import { QuickConvert } from '@/components/wallet/quick-convert'
import { ErrorState } from '@/components/ui/error-state'
import { HomePageSkeleton } from '@/components/wallet/home-page-skeleton'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { api, type Payment, type PaymentRequest, type Wallet, type Withdrawal } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useDataLoader } from '@/hooks/use-data-loader'
import { useMemo } from 'react'

// recharts is ~150 KB gzipped, so load the chart after the dashboard renders.
const RevenueChart = dynamic(
  () => import('@/components/wallet/revenue-chart').then((mod) => mod.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-panel border-hairline h-[19rem] animate-pulse rounded-2xl border" />
    ),
  }
)

interface DashboardData {
  balances: Awaited<ReturnType<typeof api.getBalances>>
  payments: Payment[]
  requests: PaymentRequest[]
  wallet: Wallet | null
  withdrawals: Withdrawal[]
}

export default function HomePage() {
  const { token } = useAuthenticatedSession()

  const { data, error, loading, reload } = useDataLoader<DashboardData>(
    async (signal) => {
      const [balances, payments, requests, wallet, withdrawals] = await Promise.all([
        api.getBalances(token, signal),
        api.listTransactions(token, 50, signal),
        api.listPaymentRequests(token, 20, signal),
        // Only used to tick off the getting-started steps, so a failure here
        // shouldn't take the whole dashboard down.
        api.getWallet(token, signal).catch(() => null),
        api.listWithdrawals(token, 1, signal).catch(() => [] as Withdrawal[]),
      ])
      return { balances, payments, requests, wallet, withdrawals }
    },
    [token]
  )

  const openRequests = useMemo(
    () => data?.requests.filter((request) => request.status === 'pending') ?? [],
    [data?.requests]
  )

  if (error) return <ErrorState message={error} onRetry={reload} />
  if (loading || !data) return <HomePageSkeleton />

  const { balances, payments } = data
  const progress = {
    wallet: data.wallet !== null,
    charge: data.requests.length > 0,
    payment: payments.some((payment) => payment.status === 'confirmed'),
    cashout: data.withdrawals.length > 0,
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Home</h1>
          <p className="text-dim mt-1 text-sm">Track balances and payment activity in one place.</p>
        </div>
        <Link
          href="/charge"
          className="from-cta-from to-cta-to flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          New charge <ArrowRight className="size-4" strokeWidth={2.5} />
        </Link>
      </header>

      <div className="mt-6">
        <OnboardingChecklist progress={progress} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="bg-panel border-hairline rounded-2xl border p-5"
          aria-live="polite"
          aria-atomic="true"
          aria-label="Available balance"
        >
          <p className="text-dim text-xs">Available to cash out</p>
          {balances.length === 0 ? (
            <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
              0.00 <span className="text-dim text-base font-medium">XLM</span>
            </p>
          ) : (
            <ul className="mt-1 space-y-3">
              {balances.map((balance) => (
                <li key={balance.asset}>
                  <BalanceFigure
                    asset={balance.asset}
                    available={balance.available}
                    pending={balance.pending}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <QuickActions />
          </div>
        </section>

        <div className="space-y-5">
          <QuickConvert openRequests={openRequests} />
          <ActivityHighlights payments={payments} openRequestCount={openRequests.length} />
        </div>
      </div>

      <div className="mt-5">
        <RevenueChart payments={payments} />
      </div>
    </div>
  )
}
