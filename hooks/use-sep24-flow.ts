'use client'

import { useCallback, useState } from 'react'
import { api } from '@/lib/api'
import { openSep24Window, waitForSep24Close } from '@/lib/sep24'

export type Sep24Kind = 'deposit' | 'withdraw'

/**
 * Drives the SEP-0024 interactive flow end-to-end: request the anchor's
 * interactive URL from the backend, open it (popup on desktop, full tab on
 * mobile — see lib/sep24.ts), then wait for it to close before letting the
 * caller refresh balances/transactions.
 */
export function useSep24Flow(token: string) {
  const [busy, setBusy] = useState<Sep24Kind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (kind: Sep24Kind, asset: string) => {
      setError(null)
      setBusy(kind)
      try {
        const interactive =
          kind === 'deposit'
            ? await api.startSep24Deposit(token, asset)
            : await api.startSep24Withdrawal(token, asset)

        const popup = openSep24Window(interactive.url)
        if (!popup) {
          setError(
            'Your browser blocked the anchor popup. Allow popups for this site and try again.'
          )
          return
        }

        await waitForSep24Close(popup)
      } catch (cause) {
        const label = kind === 'deposit' ? 'deposit' : 'withdrawal'
        setError(cause instanceof Error ? cause.message : `Could not start the ${label} flow`)
      } finally {
        setBusy(null)
      }
    },
    [token]
  )

  return {
    busy,
    error,
    startDeposit: (asset: string) => run('deposit', asset),
    startWithdraw: (asset: string) => run('withdraw', asset),
  }
}
