import { useState, useEffect, useCallback } from 'react'
import { OnrampOrder, OrderStatus } from '@/types/onramp'

export function useOrderTracking(orderId: string | null) {
  const [order, setOrder] = useState<OnrampOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable react-hooks/exhaustive-deps
    if (!orderId) {
      setLoading(false)
      setError('No order ID provided')
      return
    }

    try {
      const orderData = localStorage.getItem(`onramp:order:${orderId}`)

      if (!orderData) {
        // Create mock data for testing if no real order exists
        const mockOrder: OnrampOrder = {
          id: orderId,
          createdAt: Date.now(), // Start at current time so delays work correctly
          expiresAt: Date.now() + 13 * 60 * 1000, // 13 minutes from now
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
          status: 'awaiting_payment', // Start at awaiting_payment for demo
          transactionHash: undefined,
        }

        // Store mock data
        localStorage.setItem(`onramp:order:${orderId}`, JSON.stringify(mockOrder))
        setOrder(mockOrder)
        setLoading(false)
        return
      }

      const parsedOrder = JSON.parse(orderData) as OnrampOrder
      setOrder(parsedOrder)
      setLoading(false)
    } catch {
      setError('Failed to load order')
      setLoading(false)
    }
    // eslint-enable react-hooks/exhaustive-deps
  }, [orderId])

  const updateOrderStatus = useCallback(
    (status: OrderStatus, additionalData?: Partial<OnrampOrder>) => {
      if (!orderId) return

      setOrder((prevOrder) => {
        if (!prevOrder) return null

        const updatedOrder = { ...prevOrder, status, ...additionalData }

        // Persist to localStorage
        localStorage.setItem(`onramp:order:${orderId}`, JSON.stringify(updatedOrder))

        return updatedOrder
      })
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
