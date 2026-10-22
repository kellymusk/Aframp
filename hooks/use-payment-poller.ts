'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { api, Payment } from '@/lib/api'
import { useSession } from '@/components/session-provider'

export function usePaymentPoller(intervalMs = 30000) {
  const { session } = useSession()
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initialFetchDone = useRef(false)

  useEffect(() => {
    if (!session?.token) return

    const token = session.token

    const pollTransactions = async () => {
      try {
        const payments = await api.listTransactions(token, 20)
        const confirmedPayments = payments.filter((p: Payment) => p.status === 'confirmed')

        if (!initialFetchDone.current) {
          // On first load, seed the seen set so we don't spam historical toasts
          confirmedPayments.forEach((p: Payment) => seenIdsRef.current.add(p.id))
          initialFetchDone.current = true
          return
        }

        for (const payment of confirmedPayments) {
          if (!seenIdsRef.current.has(payment.id)) {
            seenIdsRef.current.add(payment.id)

            // Format amount (stroops to main unit conversion if needed, or raw representation)
            const formattedAmount = (Number(payment.amount_stroops) / 10000000).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 7,
              }
            )

            toast.success('New payment confirmed!', {
              description: `${formattedAmount} ${payment.asset}`,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = '/transactions'
                },
              },
              duration: 6000,
            })
          }
        }
      } catch (err) {
        // Silently catch polling errors to avoid disrupting the dashboard experience
        console.error('[poller] Failed to fetch transactions:', err)
      }
    }

    // Poll immediately on mount/session change, then set interval
    pollTransactions()
    const timer = setInterval(pollTransactions, intervalMs)

    return () => {
      clearInterval(timer)
    }
  }, [session, intervalMs])
}
