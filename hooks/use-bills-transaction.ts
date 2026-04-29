'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface BillsTimelineItem {
  id: string
  label: string
  status: 'completed' | 'pending' | 'failed'
  timestamp?: string
}

export interface BillsTransaction {
  id: string
  amount: number
  currency: string
  fee: number
  biller: string
  billerCategory: string
  accountLabel: string
  status: 'completed' | 'pending' | 'failed'
  reference: string
  createdAt: string
  paymentMethod: string
  timeline: BillsTimelineItem[]
  customerSupportEmail: string
}

export function useBillsTransaction(
  transactionId: string,
  wsUrl?: string,
  statusOverride?: string | null
) {
  const [transaction, setTransaction] = useState<BillsTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchTransaction = async () => {
      setLoading(true)
      try {
        const url = new URL(`/api/bills/transactions/${transactionId}`, window.location.origin)
        if (statusOverride) url.searchParams.set('status', statusOverride)
        const response = await fetch(url.toString(), { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load transaction')
        const data = (await response.json()) as BillsTransaction
        if (!cancelled) {
          setTransaction(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load transaction')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTransaction()

    const poll = setInterval(fetchTransaction, 5000)

    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [transactionId, statusOverride])

  useEffect(() => {
    if (!wsUrl) return
    try {
      wsRef.current = new WebSocket(wsUrl)
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as BillsTransaction
          if (data.id === transactionId) setTransaction(data)
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore websocket errors
    }

    return () => {
      wsRef.current?.close()
    }
  }, [transactionId, wsUrl])

  const statusLabel = useMemo(() => {
    if (!transaction) return ''
    return transaction.status === 'completed'
      ? 'Success'
      : transaction.status === 'failed'
        ? 'Failed'
        : 'Pending'
  }, [transaction])

  return { transaction, loading, error, statusLabel }
}
