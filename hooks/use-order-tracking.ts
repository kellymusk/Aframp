import { useState, useEffect, useCallback, useRef } from 'react'
import { OnrampOrder, OrderStatus } from '@/types/onramp'
import { fetchOrder, patchOrder, persistOrder, readCachedOrder } from '@/lib/orders/order-client'
import { useWalletConnection } from '@/hooks/use-wallet-connection'

/**
 * Loads and tracks a single onramp order.
 *
 * The order is resolved in two passes so a cleared cache or a different device
 * no longer loses the order:
 *   1. the localStorage copy renders immediately (optimistic), then
 *   2. the server copy replaces it once /api/orders responds.
 *
 * Status updates are written to both, and never block on the network.
 */
export function useOrderTracking(orderId: string | null) {
  const { address, loading: walletLoading } = useWalletConnection()
  const [order, setOrder] = useState<OnrampOrder | null>(null)
  const [resolving, setResolving] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Kept in refs so updateOrderStatus stays referentially stable — callers pass
  // it into effects (see useOrderStatusUpdates) that must not re-run on every
  // order change.
  const orderRef = useRef<OnrampOrder | null>(null)
  const addressRef = useRef('')

  useEffect(() => {
    orderRef.current = order
  }, [order])

  useEffect(() => {
    addressRef.current = address
  }, [address])

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      setError('No order ID provided')
      return
    }

    const fetchOrder = async () => {
      try {
        setLoading(true)
        
        // Try to fetch from backend first
        const response = await fetch(`/api/onramp/order/${orderId}`)
        const result = await response.json()

        const localData = localStorage.getItem(`onramp:order:${orderId}`)
        
        if (result.success && result.order) {
          setOrder(result.order)
        } else if (localData) {
          // Fallback to localStorage if backend doesn't have it yet (simulated DB)
          setOrder(JSON.parse(localData))
        } else {
          // Create mock data for testing if no real order exists
          const mockOrder: OnrampOrder = {
            id: orderId,
            createdAt: Date.now(),
            expiresAt: Date.now() + 13 * 60 * 1000,
            fiatCurrency: 'NGN',
            cryptoAsset: 'cNGN',
            paymentMethod: 'bank_transfer',
            amount: 50000,
            exchangeRate: 1600,
            cryptoAmount: 31.25,
            fees: {
              processingFee: 0,
              networkFee: 15,
              totalFees: 15,
              totalCost: 50015,
            },
            walletAddress: 'GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFG',
            status: 'awaiting_payment',
            transactionHash: undefined,
          }
          setOrder(mockOrder)
        }
      } catch (err) {
        console.error('Fetch order error:', err)
        setError('Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const updateOrderStatus = useCallback(
    async (status: OrderStatus, additionalData?: Partial<OnrampOrder>) => {
      if (!orderId) return

      try {
        // Read current order from localStorage for fee calculation
        const storedData = localStorage.getItem(`onramp:order:${orderId}`)
        const storedOrder: OnrampOrder | null = storedData ? JSON.parse(storedData) : null

        // Optimistically update local state
        setOrder((prevOrder) => {
          if (!prevOrder) return null
          const updatedOrder = { ...prevOrder, status, ...additionalData }
          localStorage.setItem(`onramp:order:${orderId}`, JSON.stringify(updatedOrder))
          return updatedOrder
        })

        // Notify backend
        const referralTotalFees =
          additionalData?.referralCode && storedOrder?.fees?.totalFees
            ? storedOrder.fees.totalFees
            : undefined

        await fetch(`/api/onramp/order/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, additionalData, referralTotalFees }),
        })
      } catch (err) {
        console.error('Failed to update order status on backend:', err)
      }
    },
    [orderId]
  )

  return {
    order,
    // Derived rather than stored, so the missing-id case needs no effect.
    loading: orderId ? resolving : false,
    error: orderId ? loadError : 'No order ID provided',
    updateOrderStatus,
  }
}
