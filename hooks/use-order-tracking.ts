import { useState, useEffect } from "react"
import { OnrampOrder, OrderStatus } from "@/types/onramp"

export function useOrderTracking(orderId: string | null) {
  const [order, setOrder] = useState<OnrampOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      setError("No order ID provided")
      return
    }

    try {
      const orderData = localStorage.getItem(`onramp:order:${orderId}`)
      if (!orderData) {
        setError("Order not found")
        setLoading(false)
        return
      }

      const parsedOrder = JSON.parse(orderData) as OnrampOrder
      setOrder(parsedOrder)
      setLoading(false)
    } catch (err) {
      setError("Failed to load order")
      setLoading(false)
    }
  }, [orderId])

  const updateOrderStatus = (status: OrderStatus, additionalData?: Partial<OnrampOrder>) => {
    if (!order) return

    const updatedOrder = { ...order, status, ...additionalData }
    setOrder(updatedOrder)
    
    // Persist to localStorage
    localStorage.setItem(`onramp:order:${order.id}`, JSON.stringify(updatedOrder))
  }

  return {
    order,
    loading,
    error,
    updateOrderStatus
  }
}
