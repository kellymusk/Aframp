'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  Download,
  Share2,
  Wallet,
  ArrowRight,
  Copy,
  ExternalLink,
  CreditCard,
  Repeat,
  Zap,
  GitBranch,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OnrampOrder } from '@/types/onramp'
import { formatCurrency } from '@/lib/onramp/formatters'
import { generateReceiptPDF } from '@/lib/onramp/receipt'

export function OnrampSuccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')

  const [order, setOrder] = useState<OnrampOrder | null>(null)
  const [copied, setCopied] = useState<'hash' | 'address' | null>(null)
  const [isAnimating, setIsAnimating] = useState(true)

  /* Load order safely (no cascading setState) */
  const storedOrder = useMemo(() => {
    if (!orderId) return null

    const data = localStorage.getItem(`onramp:order:${orderId}`)
    if (!data) return null

    try {
      return JSON.parse(data) as OnrampOrder
    } catch {
      return null
    }
  }, [orderId])

  useEffect(() => {
    if (!orderId) {
      router.push('/onramp')
      return
    }

    if (!storedOrder) {
      router.push('/onramp')
      return
    }

    if (storedOrder.status !== 'completed') {
      router.push(`/onramp/payment?order=${orderId}`)
      return
    }

    const timer = setTimeout(() => {
      setOrder(storedOrder)
      setIsAnimating(false)
    }, 0)

    return () => clearTimeout(timer)
  }, [orderId, storedOrder, router])

  const handleCopy = async (type: 'hash' | 'address', value: string) => {
    try {
      await navigator.clipboard.writeText(value)

      setCopied(type)

      setTimeout(() => {
        setCopied(null)
      }, 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const handleShare = async () => {
    if (!order) return

    const shareData = {
      title: 'AFRAMP Transaction Complete',
      text: `Successfully received ${order.cryptoAmount.toFixed(2)} ${
        order.cryptoAsset
      } for ${formatCurrency(order.amount, order.fiatCurrency)}`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.error('Share failed', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard!')
      } catch (err) {
        console.error('Copy failed', err)
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
            <div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 mb-6 transition-all duration-1000 ${
                isAnimating ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
              }`}
            >
              <CheckCircle
                className={`w-16 h-16 text-green-600 dark:text-green-400 transition-all duration-500 ${
                  isAnimating ? 'scale-0' : 'scale-100'
                }`}
              />
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-3">Purchase Complete! 🎉</h1>

            <p className="text-xl text-muted-foreground">
              You&apos;ve successfully received{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {order.cryptoAmount.toFixed(2)} {order.cryptoAsset}
              </span>
            </p>
          </div>

          {/* Transaction Summary */}
          <div className="rounded-3xl border border-border bg-card p-8 mb-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Transaction Summary</h2>

            <div className="space-y-4">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">You paid:</span>
                <span className="font-bold">
                  {formatCurrency(order.amount, order.fiatCurrency)}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">You received:</span>
                <span className="font-bold text-green-600">
                  {order.cryptoAmount.toFixed(2)} {order.cryptoAsset}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Completed:</span>
                <span>{new Date(order.completedAt || order.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Blockchain */}
          <div className="rounded-3xl border border-border bg-card p-8 mb-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-6">Blockchain Verification</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transaction hash:</span>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">8f3e2d1c...9a1b0c2d</span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy('hash', '8f3e2d1c9a1b0c2d')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className={`h-4 w-4 ${copied === 'hash' ? 'text-green-600' : ''}`} />
                  </Button>

                  <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                    <a href="https://stellar.expert" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Button
              onClick={downloadReceipt}
              variant="outline"
              className="flex items-center gap-2 h-12"
            >
              <Download className="h-5 w-5" />
              Download Receipt
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              className="flex items-center gap-2 h-12"
            >
              <Share2 className="h-5 w-5" />
              Share
            </Button>

            <Button asChild className="flex items-center gap-2 h-12">
              <Link href="/dashboard">
                <Wallet className="h-5 w-5" />
                View Wallet
              </Link>
            </Button>
          </div>

          {/* Next */}
          <div className="rounded-3xl border border-border bg-muted/20 p-8">
            <h3 className="text-2xl font-semibold mb-6">What&apos;s Next?</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button variant="ghost" className="justify-start gap-3 p-4">
                <Repeat className="h-5 w-5" />
                Swap to USDC
                <ArrowRight className="ml-auto h-5 w-5" />
              </Button>

              <Button variant="ghost" className="justify-start gap-3 p-4">
                <Zap className="h-5 w-5" />
                Pay Bills
                <ArrowRight className="ml-auto h-5 w-5" />
              </Button>

              <Button variant="ghost" className="justify-start gap-3 p-4">
                <GitBranch className="h-5 w-5" />
                Bridge Assets
                <ArrowRight className="ml-auto h-5 w-5" />
              </Button>

              <Button variant="ghost" asChild className="justify-start gap-3 p-4">
                <Link href="/onramp">
                  <CreditCard className="h-5 w-5" />
                  Buy Again
                  <ArrowRight className="ml-auto h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
