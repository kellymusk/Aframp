"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Clock, Copy, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnrampOrder, OrderStatus } from "@/types/onramp"
import { useOrderTracking } from "@/hooks/use-order-tracking"
import { notifyOrderUpdate } from "@/lib/onramp/notifications"
import { formatCurrency, truncateAddress } from "@/lib/onramp/formatters"

export function OnrampPaymentClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order")
  const { order, updateOrderStatus } = useOrderTracking(orderId)
  const [timeLeft, setTimeLeft] = useState(0)
  const [copied, setCopied] = useState("")

  useEffect(() => {
    if (!orderId || !order) return

    // Redirect if order is not in correct state
    if (order.status === "completed") {
      router.push(`/onramp/success?order=${orderId}`)
      return
    }
    
    if (order.status === "failed") {
      router.push("/onramp")
      return
    }
  }, [orderId, order, router])

  useEffect(() => {
    if (!order) return

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, order.expiresAt - now)
      setTimeLeft(remaining)
      
      if (remaining === 0) {
        // Order expired
        updateOrderStatus("failed")
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [order])

  // Simulate order status progression
  useEffect(() => {
    if (!order || order.status === "completed" || order.status === "failed") return

    const progressOrder = async () => {
      switch (order.status) {
        case "awaiting_payment":
          // Simulate payment received after 5 seconds
          setTimeout(async () => {
            updateOrderStatus("payment_received")
            await notifyOrderUpdate(order, "payment_received")
          }, 5000)
          break
        case "payment_received":
          // Simulate minting after 3 seconds
          setTimeout(() => {
            updateOrderStatus("minting")
          }, 3000)
          break
        case "minting":
          // Simulate transferring after 2 seconds
          setTimeout(() => {
            updateOrderStatus("transferring")
          }, 2000)
          break
        case "transferring":
          // Simulate completion after 3 seconds
          setTimeout(async () => {
            const completedOrder = {
              ...order,
              status: "completed" as OrderStatus,
              transactionHash: "8f3e2d1c9a1b0c2d4e5f6789abcdef0123456789fedcba9876543210",
              completedAt: Date.now()
            }
            updateOrderStatus("completed", {
              transactionHash: completedOrder.transactionHash,
              completedAt: completedOrder.completedAt
            })
            await notifyOrderUpdate(completedOrder, "transfer_complete")
            
            // Redirect to success page
            setTimeout(() => {
              router.push(`/onramp/success?order=${order.id}`)
            }, 2000)
          }, 3000)
          break
      }
    }

    progressOrder()
  }, [order?.status, router, updateOrderStatus])

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(""), 2000)
    } catch (err) {
      console.error("Copy failed", err)
    }
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case "awaiting_payment":
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          title: "Waiting for Payment",
          description: "Complete your payment to continue"
        }
      case "payment_received":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: "Payment Received",
          description: "Processing your transaction..."
        }
      case "minting":
        return {
          icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
          title: "Minting Tokens",
          description: "Creating your stablecoins on Stellar"
        }
      case "transferring":
        return {
          icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
          title: "Transferring",
          description: "Sending tokens to your wallet"
        }
      case "completed":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: "Complete!",
          description: "Transaction successful"
        }
      case "failed":
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          title: "Failed",
          description: "Transaction failed or expired"
        }
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-500" />,
          title: "Processing",
          description: "Please wait..."
        }
    }
  }

  const statusInfo = getStatusInfo(order.status)
  const progress = {
    awaiting_payment: 25,
    payment_received: 50,
    minting: 75,
    transferring: 90,
    completed: 100,
    failed: 0
  }[order.status]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base">A</span>
            </div>
            <span className="font-semibold text-foreground text-lg">Aframp</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Order Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            {timeLeft > 0 && order.status === "awaiting_payment" && (
              <p className="text-sm text-muted-foreground">
                Expires in {formatTime(timeLeft)}
              </p>
            )}
          </div>

          {/* Status Card */}
          <div className="rounded-3xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              {statusInfo.icon}
              <div>
                <h2 className="font-semibold text-foreground">{statusInfo.title}</h2>
                <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 mb-4">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {progress}% complete
            </div>
          </div>

          {/* Payment Details (only show if awaiting payment) */}
          {order.status === "awaiting_payment" && order.paymentMethod === "bank_transfer" && (
            <div className="rounded-3xl border border-border bg-card p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Bank Transfer Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">1234567890</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy("1234567890", "account")}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Name:</span>
                  <span className="text-foreground">Providus Bank</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="text-foreground">AFRAMP PAYMENTS</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(order.fees.totalCost, order.fiatCurrency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(order.fees.totalCost.toString(), "amount")}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Transfer the exact amount shown above. Partial payments will be refunded.
                </p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="rounded-3xl border border-border bg-muted/20 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">You're buying:</span>
                <span className="font-semibold text-foreground">
                  {order.cryptoAmount.toFixed(2)} {order.cryptoAsset}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">You're paying:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(order.amount, order.fiatCurrency)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-mono text-foreground text-xs">
                  {truncateAddress(order.walletAddress, 8)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment method:</span>
                <span className="text-foreground capitalize">
                  {order.paymentMethod.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
