'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { ActivityHighlights } from '@/components/wallet/activity-highlights'
import { BalanceFigure } from '@/components/wallet/balance-figure'
import { QuickActions } from '@/components/wallet/quick-actions'
import { QuickConvert } from '@/components/wallet/quick-convert'
import { TopAssets } from '@/components/wallet/top-assets'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { api, type Balance, type Payment, type PaymentRequest } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'

export default function HomePage() {
  const { token } = useAuthenticatedSession()
  const [balances, setBalances] = useState<Balance[] | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [openRequests, setOpenRequests] = useState<PaymentRequest[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      try {
        const [nextBalances, nextPayments, requests] = await Promise.all([
          api.getBalances(token, signal),
          api.listTransactions(token, 50, signal),
          api.listPaymentRequests(token, 20, signal),
        ])
        setBalances(nextBalances)
        setPayments(nextPayments)
        setOpenRequests(requests.filter((request) => request.status === 'pending'))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load your dashboard')
        setBalances([])
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (error) return <ErrorState message={error} onRetry={() => void load()} />
  if (!balances) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
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

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="bg-panel border-hairline rounded-2xl border p-5">
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

          <div className="mt-6">
            <TopAssets balances={balances} />
          </div>
        </section>

        <div className="space-y-5">
          <QuickConvert openRequests={openRequests} />
          <ActivityHighlights payments={payments} openRequestCount={openRequests.length} />
        </div>
      </div>
    </div>
  )
}
