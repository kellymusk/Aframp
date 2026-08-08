'use client'

import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts/notification-context'

const HORIZON_URL = 'https://horizon.stellar.org'

/**
 * Subscribes to Stellar Horizon's SSE payment stream for `accountId`.
 *
 * On every incoming payment a "payment" notification is pushed via
 * `NotificationContext.push()`. The stream cursor is kept in a ref so
 * reconnects don't replay historic transactions.
 *
 * Only activates when `accountId` is a valid G… public key.
 */
export function useStellarPaymentStream(accountId: string | null) {
  const { push } = useNotifications()
  const esRef = useRef<EventSource | null>(null)
  const lastCursorRef = useRef<string>('now')

  useEffect(() => {
    if (!accountId || !/^G[A-Z2-7]{55}$/.test(accountId)) return

    function connect() {
      const url = new URL(
        `${HORIZON_URL}/accounts/${accountId}/payments`
      )
      url.searchParams.set('cursor', lastCursorRef.current)
      url.searchParams.set('order', 'asc')

      const es = new EventSource(url.toString())
      esRef.current = es

      es.onmessage = (event) => {
        try {
          const record = JSON.parse(event.data as string) as {
            id: string
            type: string
            type_i: number
            paging_token: string
            to?: string
            from?: string
            amount?: string
            asset_code?: string
            asset_type?: string
          }

          // Save cursor so reconnect doesn't replay
          if (record.paging_token) {
            lastCursorRef.current = record.paging_token
          }

          // type_i 1 = payment, type_i 2 = path_payment_strict_receive,
          // type_i 13 = path_payment_strict_send
          const isPayment = [1, 2, 13].includes(record.type_i)
          if (!isPayment) return

          // Only notify for inbound payments to this account
          if (record.to !== accountId) return

          const asset =
            record.asset_type === 'native'
              ? 'XLM'
              : (record.asset_code ?? 'tokens')
          const amount = record.amount
            ? parseFloat(record.amount).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })
            : 'some'

          void push({
            title: 'Payment received',
            message: `You received ${amount} ${asset} on your Stellar wallet.`,
            category: 'payment',
            priority: 'high',
            metadata: {
              type: record.type,
              amount: record.amount,
              asset,
              from: record.from,
              pagingToken: record.paging_token,
            },
          })
        } catch {
          // malformed event — ignore
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        // Reconnect after 10 s with exponential back-off up to 60 s
        const delay = Math.min(10_000 * (1 + Math.random()), 60_000)
        setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [accountId, push])
}
