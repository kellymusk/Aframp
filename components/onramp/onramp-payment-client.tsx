'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Clock, Copy, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { OrderStatus } from '@/types/onramp'
import { useOrderTracking } from '@/hooks/use-order-tracking'
import { formatCurrency, truncateAddress } from '@/lib/calculations'
import { buildEscrowPaymentXdr, AFRAMP_ESCROW_ADDRESS } from '@/lib/stellar-p2p'
import { signTransactionWithFreighter } from '@/lib/wallet/freighter'
import * as StellarSdk from '@stellar/stellar-sdk'
import type { FreighterNetwork } from '@/lib/wallet'

/** Resolve the Freighter network from localStorage (same pattern as rest of app). */
function getWalletNetwork(): FreighterNetwork {
  if (typeof window === 'undefined') return 'PUBLIC'
  return (localStorage.getItem('walletNetwork') as FreighterNetwork) ?? 'PUBLIC'
}

/** Asset issuer for non-XLM assets (mirrors the env-var pattern in stellar-p2p). */
const ASSET_ISSUERS: Record<string, string> = {
  cNGN:
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CNGN_ISSUER) ||
    'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE',
  USDC:
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USDC_ISSUER) ||
    'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  cKES: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CKES_ISSUER) || '',
  cGHS: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CGHS_ISSUER) || '',
}

export function OnrampPaymentClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const { order, updateOrderStatus } = useOrderTracking(orderId)
  const [timeLeft, setTimeLeft] = useState(0)

  // Stellar payment state
  const [stellarStep, setStellarStep] = useState<
    'idle' | 'building' | 'signing' | 'submitting' | 'done' | 'error'
  >('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [stellarError, setStellarError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId || !order) return

    if (order.status === 'completed') {
      router.push(`/onramp/success?order=${orderId}`)
      return
    }

    if (order.status === 'failed') {
      router.push('/onramp')
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
        updateOrderStatus('failed')
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [order, updateOrderStatus])

  // Set initial status to awaiting_payment when page loads
  useEffect(() => {
    if (!order || order.status !== 'created') return

    const timer = setTimeout(() => {
      updateOrderStatus('awaiting_payment')
    }, 0)

    return () => clearTimeout(timer)
  }, [order, updateOrderStatus])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch (err) {
      console.error('Copy failed', err)
      toast.error('Failed to copy — please copy manually')
    }
  }

  /**
   * Full Stellar payment flow:
   * 1. Build XDR (payment from user wallet → Aframp escrow)
   * 2. Sign with Freighter
   * 3. Submit to Horizon
   * 4. Store txHash on the order
   * 5. Trigger fiat disbursement webhook (PATCH /api/onramp/order/:id/status)
   */
  const handleStellarPayment = useCallback(async () => {
    if (!order) return

    const walletAddress = localStorage.getItem('walletAddress') ?? ''
    if (!walletAddress) {
      setStellarError('No wallet connected. Please connect your Freighter wallet.')
      return
    }

    const network = getWalletNetwork()
    const horizonUrl =
      network === 'TESTNET'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'

    setStellarError(null)
    setStellarStep('building')

    try {
      // ── Step 1: Build unsigned XDR ──────────────────────────────────────
      const xdr = await buildEscrowPaymentXdr({
        sourcePublicKey: walletAddress,
        amount: order.cryptoAmount.toFixed(7),
        assetCode: order.cryptoAsset,
        assetIssuer: ASSET_ISSUERS[order.cryptoAsset] || undefined,
        orderId: order.id,
        network,
      })

      // ── Step 2: Sign with Freighter ─────────────────────────────────────
      setStellarStep('signing')
      const networkPassphrase =
        network === 'TESTNET'
          ? StellarSdk.Networks.TESTNET
          : StellarSdk.Networks.PUBLIC

      const signed = await signTransactionWithFreighter(xdr, network, networkPassphrase)
      if (signed.error || !signed.signedTxXdr) {
        throw new Error(signed.error ?? 'Transaction signing was cancelled or failed')
      }

      // ── Step 3: Submit to Horizon ───────────────────────────────────────
      setStellarStep('submitting')
      const submitRes = await fetch(`${horizonUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `tx=${encodeURIComponent(signed.signedTxXdr)}`,
      })
      const submitData = await submitRes.json()
      if (!submitRes.ok) {
        const resultCode =
          submitData?.extras?.result_codes?.transaction ??
          submitData?.title ??
          'Transaction submission failed'
        throw new Error(resultCode)
      }

      const hash: string = submitData.hash
      setTxHash(hash)

      // ── Step 4: Store txHash and update order status ────────────────────
      // Persist hash in localStorage for the processing page
      const storedOrder = JSON.parse(
        localStorage.getItem(`onramp:order:${order.id}`) ?? '{}'
      )
      const updatedOrder = { ...storedOrder, txHash: hash, status: 'payment_received' }
      localStorage.setItem(`onramp:order:${order.id}`, JSON.stringify(updatedOrder))
      localStorage.setItem('onramp:latest-order', JSON.stringify(updatedOrder))

      // ── Step 5: Trigger fiat disbursement webhook ───────────────────────
      // Notifies the backend that the on-chain payment is confirmed so it
      // can initiate the fiat payout to the recipient.
      await fetch(`/api/onramp/order/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'payment_received',
          additionalData: {
            txHash: hash,
            escrowAddress: AFRAMP_ESCROW_ADDRESS,
            walletAddress,
            referralCode: order.referralCode,
          },
        }),
      })

      setStellarStep('done')
      updateOrderStatus('payment_received')

      // Navigate to processing page after a brief pause
      setTimeout(() => {
        router.push(`/onramp/processing/${order.id}`)
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stellar payment failed'
      setStellarError(msg)
      setStellarStep('error')
    }
  }, [order, router, updateOrderStatus])

  // ── Legacy bank-transfer confirmation (non-Stellar payment methods) ────
  const handleBankTransferConfirm = useCallback(() => {
    if (!order) return
    updateOrderStatus('payment_received')
    setTimeout(() => {
      router.push(`/onramp/processing/${order.id}`)
    }, 0)
  }, [order, router, updateOrderStatus])

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case 'awaiting_payment':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          title: 'Waiting for Payment',
          description: 'Complete your payment to continue',
        }
      case 'payment_received':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Payment Received',
          description: 'Processing your transaction...',
        }
      case 'minting':
        return {
          icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
          title: 'Minting Tokens',
          description: 'Creating your stablecoins on Stellar',
        }
      case 'transferring':
        return {
          icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
          title: 'Transferring',
          description: 'Sending tokens to your wallet',
        }
      case 'completed':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Complete!',
          description: 'Transaction successful',
        }
      case 'failed':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          title: 'Failed',
          description: 'Transaction failed or expired',
        }
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-500" />,
          title: 'Processing',
          description: 'Please wait...',
        }
    }
  }

  const statusInfo = getStatusInfo(order.status)

  const progress =
    (
      {
        created: 10,
        awaiting_payment: 25,
        payment_received: 50,
        minting: 75,
        transferring: 90,
        completed: 100,
        failed: 0,
      } as const
    )[order.status as OrderStatus] ?? 0

  const isStellarPayment =
    order.paymentMethod === 'bank_transfer' ? false : true

  /** Button label / disabled state for the Stellar signing button */
  const stellarButtonLabel = () => {
    switch (stellarStep) {
      case 'building':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Building transaction…
          </>
        )
      case 'signing':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Waiting for Freighter…
          </>
        )
      case 'submitting':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting to Stellar…
          </>
        )
      case 'done':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Payment confirmed!
          </>
        )
      default:
        return 'Pay with Freighter'
    }
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
          {/* Order Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            {timeLeft > 0 && order.status === 'awaiting_payment' && (
              <p className="text-sm text-muted-foreground">Expires in {formatTime(timeLeft)}</p>
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

            <div className="text-xs text-muted-foreground">{progress}% complete</div>
          </div>

          {/* ── Stellar Payment Section ─────────────────────────────────────── */}
          {order.status === 'awaiting_payment' && isStellarPayment && (
            <div className="rounded-3xl border border-border bg-card p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Pay with Stellar Wallet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send{' '}
                <span className="font-semibold">
                  {order.cryptoAmount.toFixed(7)} {order.cryptoAsset}
                </span>{' '}
                from your Freighter wallet to the Aframp escrow. Your Freighter extension will open
                for you to sign.
              </p>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escrow address:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground text-xs">
                      {truncateAddress(AFRAMP_ESCROW_ADDRESS, 8)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(AFRAMP_ESCROW_ADDRESS)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-foreground">
                    {order.cryptoAmount.toFixed(7)} {order.cryptoAsset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memo (order ID):</span>
                  <span className="font-mono text-foreground text-xs">
                    {order.id.slice(0, 28)}
                  </span>
                </div>
              </div>

              {/* Stellar error */}
              {stellarStep === 'error' && stellarError && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{stellarError}</span>
                </div>
              )}

              {/* txHash on success */}
              {stellarStep === 'done' && txHash && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-green-700 dark:text-green-300">Payment confirmed on-chain!</span>
                  <a
                    href={`https://stellar.expert/explorer/public/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-primary hover:underline flex items-center gap-1 text-xs"
                  >
                    View tx <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <Button
                onClick={handleStellarPayment}
                disabled={stellarStep !== 'idle' && stellarStep !== 'error'}
                className="w-full"
                size="lg"
              >
                {stellarButtonLabel()}
              </Button>

              {stellarStep === 'error' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setStellarStep('idle')}
                >
                  Try again
                </Button>
              )}
            </div>
          )}

          {/* ── Bank Transfer Section ───────────────────────────────────────── */}
          {order.status === 'awaiting_payment' && order.paymentMethod === 'bank_transfer' && (
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
                      onClick={() => handleCopy('1234567890')}
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
                      onClick={() => handleCopy(order.fees.totalCost.toString())}
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
                <span className="text-muted-foreground">You&apos;re buying:</span>
                <span className="font-semibold text-foreground">
                  {order.cryptoAmount.toFixed(2)} {order.cryptoAsset}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">You&apos;re paying:</span>
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
                  {order.paymentMethod.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Bank-transfer confirm button (after user has manually sent funds) */}
          {order.status === 'awaiting_payment' && order.paymentMethod === 'bank_transfer' && (
            <div className="mt-6">
              <Button
                onClick={handleBankTransferConfirm}
                className="w-full"
                size="lg"
              >
                I&apos;ve Made the Transfer
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-2">
                Click this button after completing your bank transfer
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
