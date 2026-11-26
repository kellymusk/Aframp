'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { api, Payment } from '@/lib/api'
import { useSession } from '@/components/session-provider'

/** Upper bound for the backoff delay between polls after repeated failures. */
const MAX_BACKOFF_MS = 5 * 60 * 1000

export function usePaymentPoller(intervalMs = 30000) {
  const { session } = useSession()
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initialFetchDone = useRef(false)

  useEffect(() => {
    if (!session?.token) return

    const token = session.token
    let cancelled = false
    let inFlight = false
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined

    const pollTransactions = async () => {
      // Overlap guard: never start a poll while the previous one is pending.
      if (inFlight || cancelled) return
      inFlight = true
      controller = new AbortController()
      const { signal } = controller

      try {
        const payments = await api.listTransactions(token, 20, signal)
        // Unmounted (or aborted) while the request was in flight — drop the result.
        if (cancelled || signal.aborted) return

        failures = 0
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
        if (cancelled || signal.aborted) return
        // Silently catch polling errors to avoid disrupting the dashboard experience.
        // Log only the first failure of a streak to avoid spamming the console.
        failures += 1
        if (failures === 1) {
          console.error('[poller] Failed to fetch transactions:', err)
        }
      } finally {
        inFlight = false
      }
    }

    const scheduleNext = () => {
      if (cancelled) return
      // Exponential backoff while the backend keeps failing, reset on success.
      const delay = Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS)
      timer = setTimeout(async () => {
        await pollTransactions()
        scheduleNext()
      }, Math.max(delay, intervalMs))
    }

    // Poll immediately on mount/session change, then keep polling.
    pollTransactions().finally(scheduleNext)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      controller?.abort()
    }
  }, [session, intervalMs])
}
