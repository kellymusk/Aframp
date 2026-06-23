import { useState, useEffect, useCallback } from 'react'
import { OnrampOrder, OrderStatus } from '@/types/onramp'

export function useOrderTracking(orderId: string | null) {
  const [order, setOrder] = useState<OnrampOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        // Optimistically update local state
        setOrder((prevOrder) => {
          if (!prevOrder) return null
          const updatedOrder = { ...prevOrder, status, ...additionalData }
          localStorage.setItem(`onramp:order:${orderId}`, JSON.stringify(updatedOrder))
          return updatedOrder
        })

        // Notify backend
        await fetch(`/api/onramp/order/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, additionalData }),
        })
      } catch (err) {
        console.error('Failed to update order status on backend:', err)
      }
    },
    [orderId]
  )

  return {
    order,
    loading,
    error,
    updateOrderStatus,
  }
}
