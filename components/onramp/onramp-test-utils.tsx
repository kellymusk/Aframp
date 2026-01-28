"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { OnrampOrder } from "@/types/onramp"
import { generateReceiptPDF } from "@/lib/onramp/receipt"
import { notifyOrderUpdate } from "@/lib/onramp/notifications"
import { logSuccessfulConversion } from "@/lib/onramp/flow-simulation"

export function OnrampTestUtils() {
  const [isLoading, setIsLoading] = useState(false)

  // Sample order data matching your specifications
  const sampleOrder: OnrampOrder = {
    id: "onr_1234567890abcdef",
    createdAt: Date.now() - 222000, // 3 minutes 42 seconds ago
    completedAt: Date.now(),
    expiresAt: Date.now() + 1800000, // 30 minutes from now
    fiatCurrency: "NGN",
    cryptoAsset: "cNGN",
    paymentMethod: "bank_transfer",
    amount: 50000,
    exchangeRate: 0.0006235,
    cryptoAmount: 31.17,
    fees: {
      processingFee: 0,
      networkFee: 0.15,
      totalFees: 0.15,
      totalCost: 50000.15
    },
    walletAddress: "GAXYZABC123456789",
    status: "completed",
    transactionHash: "8f3e2d1c9a1b0c2d"
  }

  const testReceiptGeneration = () => {
    setIsLoading(true)
    try {
      generateReceiptPDF(sampleOrder)
      console.log("✅ Receipt generated successfully")
    } catch (error) {
      console.error("❌ Receipt generation failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const testNotifications = async () => {
    setIsLoading(true)
    try {
      console.log("🔔 Testing notification system...")
      
      // Test all notification types
      await notifyOrderUpdate(sampleOrder, "order_created")
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await notifyOrderUpdate(sampleOrder, "payment_received")
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await notifyOrderUpdate(sampleOrder, "transfer_complete")
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log("✅ All notifications sent successfully")
    } catch (error) {
      console.error("❌ Notification test failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const testAnalytics = () => {
    setIsLoading(true)
    try {
      const analyticsData = logSuccessfulConversion(sampleOrder)
      console.log("✅ Analytics logged:", analyticsData)
    } catch (error) {
      console.error("❌ Analytics logging failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createTestOrder = () => {
    // Store sample order in localStorage for testing
    localStorage.setItem(`onramp:order:${sampleOrder.id}`, JSON.stringify(sampleOrder))
    console.log("✅ Test order created in localStorage")
    
    // Navigate to success page
    window.location.href = `/onramp/success?order=${sampleOrder.id}`
  }

  return (
    <div className="p-6 border border-border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">🧪 Onramp Test Utils</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Test the enhanced onramp success page functionality
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={testReceiptGeneration}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Test Receipt PDF
        </Button>
        
        <Button 
          onClick={testNotifications}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Test Notifications
        </Button>
        
        <Button 
          onClick={testAnalytics}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Test Analytics
        </Button>
        
        <Button 
          onClick={createTestOrder}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
          size="sm"
        >
          View Success Page
        </Button>
      </div>
      
      {isLoading && (
        <div className="mt-4 text-sm text-muted-foreground">
          Processing... Check console for logs
        </div>
      )}
    </div>
  )
}
