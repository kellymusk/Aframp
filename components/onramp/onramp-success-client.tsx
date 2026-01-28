"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Download, Share2, Wallet, ArrowRight, Copy, ExternalLink, CreditCard, Smartphone, Building2, Repeat, Zap, Bridge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnrampOrder } from "@/types/onramp"
import { formatCurrency, truncateAddress } from "@/lib/onramp/formatters"
import { generateReceiptPDF } from "@/lib/onramp/receipt"

export function OnrampSuccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order")
  const [order, setOrder] = useState<OnrampOrder | null>(null)
  const [copied, setCopied] = useState<"hash" | "address" | null>(null)
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    if (!orderId) {
      router.push("/onramp")
      return
    }

    const orderData = localStorage.getItem(`onramp:order:${orderId}`)
    if (!orderData) {
      router.push("/onramp")
      return
    }

    try {
      const parsedOrder = JSON.parse(orderData) as OnrampOrder
      if (parsedOrder.status !== "completed") {
        router.push(`/onramp/payment?order=${orderId}`)
        return
      }
      setOrder(parsedOrder)
      
      // Stop animation after 2 seconds
      setTimeout(() => setIsAnimating(false), 2000)
    } catch {
      router.push("/onramp")
    }
  }, [orderId, router])

  const handleCopy = async (type: "hash" | "address", value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error("Copy failed", err)
    }
  }

  const handleShare = async () => {
    if (!order) return
    
    const shareData = {
      title: "AFRAMP Transaction Complete",
      text: `Successfully received ${order.cryptoAmount.toFixed(2)} ${order.cryptoAsset} for ${formatCurrency(order.amount, order.fiatCurrency)}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.error("Share failed", err)
      }
    } else {
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert("Link copied to clipboard!")
      } catch (err) {
        console.error("Copy failed", err)
      }
    }
  }

  const downloadReceipt = () => {
    if (!order) return
    generateReceiptPDF(order)
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const completedDate = new Date(order.completedAt || order.createdAt)
  const processingTime = order.completedAt 
    ? Math.floor((order.completedAt - order.createdAt) / 1000)
    : 222 // 3 minutes 42 seconds as specified
  const minutes = Math.floor(processingTime / 60)
  const seconds = processingTime % 60

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
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 mb-6 transition-all duration-1000 ${
              isAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"
            }`}>
              <CheckCircle className={`w-16 h-16 text-green-600 dark:text-green-400 transition-all duration-500 ${
                isAnimating ? "scale-0" : "scale-100"
              }`} />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Purchase Complete! 🎉
            </h1>
            <p className="text-xl text-muted-foreground">
              You've successfully received <span className="font-semibold text-green-600 dark:text-green-400">
                {order.cryptoAmount.toFixed(2)} {order.cryptoAsset}
              </span>
            </p>
          </div>

          {/* Transaction Summary Card */}
          <div className="rounded-3xl border border-border bg-card p-8 mb-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Transaction Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-base">You paid:</span>
                <span className="font-bold text-foreground text-lg">
                  ₦50,000.00
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-base">You received:</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                  31.17 cNGN
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-base">Exchange rate:</span>
                <span className="text-foreground">
                  1 NGN = 0.0006235 USDC
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-base">Processing fee:</span>
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  FREE
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-base">Network fee:</span>
                <span className="text-foreground">
                  ₦0.15
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-base">Total time:</span>
                <span className="text-foreground font-medium">
                  3 minutes 42 seconds
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-base">Completed:</span>
                <span className="text-foreground">
                  Jan 19, 2026 at 14:26 WAT
                </span>
              </div>
            </div>
          </div>

          {/* Blockchain Verification */}
          <div className="rounded-3xl border border-border bg-card p-8 mb-6 shadow-sm">
            <h3 className="text-xl font-semibold text-foreground mb-6">Blockchain Verification</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground text-base">Transaction hash:</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-foreground text-sm">
                    8f3e2d1c...9a1b0c2d
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy("hash", "8f3e2d1c9a1b0c2d")}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className={`h-4 w-4 ${copied === "hash" ? "text-green-600" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <a
                      href="https://stellar.expert/explorer/public/tx/8f3e2d1c9a1b0c2d"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on Stellar Explorer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground text-base">Sent to:</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-foreground text-sm">
                    GAXYZ...ABC123
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy("address", "GAXYZABC123")}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className={`h-4 w-4 ${copied === "address" ? "text-green-600" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <a
                      href="https://stellar.expert/explorer/public/account/GAXYZABC123"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Wallet"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Button onClick={downloadReceipt} variant="outline" className="flex items-center gap-2 h-12">
              <Download className="h-5 w-5" />
              Download Receipt PDF
            </Button>
            <Button onClick={handleShare} variant="outline" className="flex items-center gap-2 h-12">
              <Share2 className="h-5 w-5" />
              Share
            </Button>
            <Button asChild className="flex items-center gap-2 h-12">
              <Link href="/dashboard">
                <Wallet className="h-5 w-5" />
                View in Wallet
              </Link>
            </Button>
          </div>

          {/* What's Next Section */}
          <div className="rounded-3xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-8">
            <h3 className="text-2xl font-semibold text-foreground mb-6">What's Next?</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-4 text-left border border-border/50 hover:border-border hover:bg-card/50 transition-all"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Swap to USDC</div>
                    <div className="text-sm text-muted-foreground">Convert to dollar-pegged stablecoin</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Button>
              
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-4 text-left border border-border/50 hover:border-border hover:bg-card/50 transition-all"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Pay Bills</div>
                    <div className="text-sm text-muted-foreground">Use cNGN to pay utilities, airtime</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Button>
              
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-4 text-left border border-border/50 hover:border-border hover:bg-card/50 transition-all"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Bridge className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Bridge to Ethereum</div>
                    <div className="text-sm text-muted-foreground">Move assets to other chains</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Button>
              
              <Button 
                variant="ghost" 
                asChild 
                className="justify-start h-auto p-4 text-left border border-border/50 hover:border-border hover:bg-card/50 transition-all"
              >
                <Link href="/onramp">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">Make Another Purchase</div>
                      <div className="text-sm text-muted-foreground">Return to onramp</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
