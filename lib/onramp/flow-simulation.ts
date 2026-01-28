import { OnrampOrder } from "@/types/onramp"
import { notifyOrderUpdate } from "./notifications"

/**
 * Simulates the complete onramp flow with notifications
 * This would be called by your backend services at each stage
 */
export async function simulateOnrampFlow(order: OnrampOrder) {
  console.log("🚀 Starting onramp flow simulation...")

  // 1. Order created
  console.log("📝 Order created")
  await notifyOrderUpdate(order, "order_created")
  await delay(2000)

  // 2. Payment received
  console.log("💳 Payment received")
  const updatedOrder = { ...order, status: "payment_received" as const }
  await notifyOrderUpdate(updatedOrder, "payment_received")
  await delay(3000)

  // 3. Transaction complete
  console.log("✅ Transaction complete")
  const completedOrder = { 
    ...updatedOrder, 
    status: "completed" as const,
    transactionHash: "8f3e2d1c9a1b0c2d",
    completedAt: Date.now()
  }
  await notifyOrderUpdate(completedOrder, "transfer_complete")

  console.log("🎉 Onramp flow completed successfully!")
  return completedOrder
}

/**
 * Logs successful conversion for analytics
 */
export function logSuccessfulConversion(order: OnrampOrder) {
  const analyticsData = {
    orderId: order.id,
    amount: order.amount,
    fiatCurrency: order.fiatCurrency,
    cryptoAmount: order.cryptoAmount,
    cryptoAsset: order.cryptoAsset,
    paymentMethod: order.paymentMethod,
    exchangeRate: order.exchangeRate,
    processingTime: order.completedAt ? order.completedAt - order.createdAt : 0,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
    referrer: typeof window !== "undefined" ? window.document.referrer : null
  }

  console.log("📊 Analytics: Successful conversion logged", analyticsData)
  
  // In production, this would send to your analytics service
  // Examples: Google Analytics, Mixpanel, Amplitude, etc.
  
  return analyticsData
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
