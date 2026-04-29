import { useEffect, useRef } from 'react'
import type { OnrampOrder, OrderStatus } from '@/types/onramp'

// Mock Stellar SDK functions - replace with actual Stellar SDK in production
const mockStellarOperations = {
  checkTrustline: async (_address: string, _assetCode: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return Math.random() > 0.2 // 80% chance of having trustline
  },

  mintStablecoin: async (_amount: number, _assetCode: string): Promise<string> => {
    // Simulate minting process
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return `mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  sendPayment: async (
    _destination: string,
    _amount: number,
    _assetCode: string
  ): Promise<string> => {
    // Simulate payment transaction
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  checkTransactionStatus: async (_txHash: string): Promise<'pending' | 'confirmed' | 'failed'> => {
    // Simulate transaction confirmation
    await new Promise((resolve) => setTimeout(resolve, 500))
    return Math.random() > 0.1 ? 'confirmed' : 'pending' // 90% success rate
  },
}

interface UseOrderStatusUpdatesProps {
  orderId: string | null
  updateOrderStatus: (status: OrderStatus, additionalData?: Partial<OnrampOrder>) => void
}

export function useOrderStatusUpdates(
  orderId: string | null,
  updateOrderStatus: UseOrderStatusUpdatesProps['updateOrderStatus']
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const processedSteps = useRef<Set<OrderStatus>>(new Set())

  useEffect(() => {
    if (!orderId) return

    const processOrderStatus = async () => {
      try {
        // Get current order from localStorage
        const orderData = localStorage.getItem(`onramp:order:${orderId}`)
        if (!orderData) return

        const order: OnrampOrder = JSON.parse(orderData)

        // Don't process if already completed or failed
        if (order.status === 'completed' || order.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return
        }

        // Simulate realistic status progression
        await simulateStatusProgression(order, updateOrderStatus, processedSteps.current)
      } catch (error) {
        console.error('Error processing order status:', error)
        updateOrderStatus('failed')
      }
    }

    // Start polling every 3 seconds
    intervalRef.current = setInterval(processOrderStatus, 3000)

    // Run immediately
    processOrderStatus()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [orderId, updateOrderStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}

async function simulateStatusProgression(
  order: OnrampOrder,
  updateOrderStatus: (status: OrderStatus, additionalData?: Partial<OnrampOrder>) => void,
  processedSteps: Set<OrderStatus>
) {
  const now = Date.now()
  const timeSinceCreation = now - order.createdAt

  // Calculate minimum time thresholds for each transition
  // This ensures proper delays between status changes
  const PAYMENT_CONFIRMATION_DELAY = 30000 // 30 seconds after creation
  const MINTING_DELAY = 90000 // 90 seconds after creation (1 min after payment received)
  const TRANSFER_DELAY = 120000 // 120 seconds after creation (30 sec after minting started)

  // Simulate payment confirmation (after 30 seconds from creation)
  if (
    order.status === 'created' &&
    timeSinceCreation > PAYMENT_CONFIRMATION_DELAY &&
    !processedSteps.has('payment_received')
  ) {
    processedSteps.add('payment_received')
    updateOrderStatus('payment_received')
    return
  }

  // Simulate minting process (after 90 seconds from creation, i.e., 60 sec after payment received)
  if (
    order.status === 'payment_received' &&
    timeSinceCreation > MINTING_DELAY &&
    !processedSteps.has('minting')
  ) {
    processedSteps.add('minting')
    updateOrderStatus('minting')

    // Start minting process
    try {
      const mintTxHash = await mockStellarOperations.mintStablecoin(
        order.cryptoAmount,
        order.cryptoAsset
      )

      // Check if trustline exists
      const hasTrustline = await mockStellarOperations.checkTrustline(
        order.walletAddress,
        order.cryptoAsset
      )

      if (!hasTrustline) {
        console.warn('Trustline not found, but continuing for demo')
      }

      updateOrderStatus('transferring', { transactionHash: mintTxHash })
    } catch {
      updateOrderStatus('failed')
    }
    return
  }

  // Simulate transfer to wallet (after 120 seconds from creation, i.e., 30 sec after minting)
  if (
    order.status === 'transferring' &&
    timeSinceCreation > TRANSFER_DELAY &&
    !processedSteps.has('completed')
  ) {
    processedSteps.add('completed')

    try {
      // Send payment to destination wallet
      const paymentTxHash = await mockStellarOperations.sendPayment(
        order.walletAddress,
        order.cryptoAmount,
        order.cryptoAsset
      )

      // Wait for confirmation
      let attempts = 0
      let status: 'pending' | 'confirmed' | 'failed' = 'pending'

      while (status === 'pending' && attempts < 10) {
        status = await mockStellarOperations.checkTransactionStatus(paymentTxHash)
        attempts++

        if (status === 'pending') {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      if (status === 'confirmed') {
        updateOrderStatus('completed', {
          transactionHash: paymentTxHash,
          completedAt: Date.now(),
        })

        // Send notification (mock)
        await sendCompletionNotification(order)
      } else {
        updateOrderStatus('failed')
      }
    } catch {
      updateOrderStatus('failed')
    }
    return
  }
}

async function sendCompletionNotification(order: OnrampOrder) {
  // Mock notification sending
  console.warn(`Sending completion notification for order ${order.id}`)

  // In real implementation, this would:
  // 1. Send email notification
  // 2. Send SMS notification
  // 3. Send push notification (if mobile app)
  // 4. Update database status

  try {
    // Mock API call
    await fetch('/api/notifications/order-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        email: 'user@example.com', // Would get from user profile
        phone: '+1234567890', // Would get from user profile
        amount: order.cryptoAmount,
        asset: order.cryptoAsset,
        transactionHash: order.transactionHash,
      }),
    })
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}
