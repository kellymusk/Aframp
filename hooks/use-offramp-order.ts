'use client'

import { useEffect, useState } from 'react'
import type { OfframpOrder } from '@/types/offramp'
import { fetchOrder, readCachedOrder } from '@/lib/orders/order-client'
import { useWalletConnection } from '@/hooks/use-wallet-connection'

/**
 * Loads an offramp order by id.
 *
 * Resolves in two passes, mirroring useOrderTracking: the localStorage copy
 * renders immediately, then the server copy from /api/orders replaces it.  The
 * server pass is what lets a user resume an order after clearing site data or
 * on a second device.
 */
export function useOfframpOrder(orderId: string | null) {
  const { address, loading: walletLoading } = useWalletConnection()
  const [order, setOrder] = useState<OfframpOrder | null>(null)
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    // Wait for the wallet address — the server lookup is ownership-scoped.
    if (!orderId || walletLoading) return

    let cancelled = false

    // Deferred to a microtask so the optimistic cache read does not call
    // setState synchronously inside the effect body.
    const load = async () => {
      // Pass 1 — optimistic render from the local cache.
      const cached = readCachedOrder<OfframpOrder>('offramp', orderId)
      if (cached && !cancelled) {
        setOrder(cached)
        setResolving(false)
      }

      // Pass 2 — reconcile with the server copy.
      const remote = await fetchOrder<OfframpOrder>('offramp', orderId, address)
      if (cancelled) return

      if (remote) setOrder(remote)
      setResolving(false)
    }

    void Promise.resolve().then(load)

    return () => {
      cancelled = true
    }
  }, [orderId, address, walletLoading])

  // Derived rather than stored, so the missing-id case needs no effect.
  return { order, loading: orderId ? resolving : false }
}
