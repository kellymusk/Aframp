'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

export type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
Let's build the notification polling feature step by step, adhering strictly to the workflow, rules, and structure of the repository.

### Step 3 — Create the Polling Hook & Install Sonner

First, we install `sonner` so we have a clean, lightweight toast system available. 

Let's create a custom hook `hooks/use-payment-poller.ts` that handles polling `/transactions` every 30 seconds, tracks seen confirmed payments to avoid duplicate toasts, formats the amount and asset correctly, and provides a direct link/action to view the transaction.

### Step 4 — Instructions to Create/Modify Files

#### 1. CREATE: `hooks/use-payment-poller.ts`
Put the complete code below into `hooks/use-payment-poller.ts`:

```typescript
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
            const formattedAmount = (Number(payment.amount_stroops) / 10000000).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 7,
            })

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