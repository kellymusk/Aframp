'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectButton } from '@/components/Wallet'
import { useWallet } from '@/hooks/useWallet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OnrampCalculator } from '@/components/onramp/onramp-calculator'
import { RecentTransactions } from '@/components/onramp/recent-transactions'
import { OnrampFeeSummary } from '@/components/onramp/onramp-fee-summary'
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { useOnrampForm } from '@/hooks/use-onramp-form'
import { useWalletConnection } from '@/hooks/use-wallet-connection'
import { OnrampTestUtils } from '@/components/onramp/onramp-test-utils'
import type { CryptoAsset, FiatCurrency } from '@/types/onramp'
import { isValidStellarAddress } from '@/lib/calculations'
import type { OnrampOrder } from '@/types/onramp'
import { csrfHeaders } from '@/lib/security/csrf-client'
import { Button } from '@/components/ui/button' // Added missing import for Button
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAppliedReferralCode,
  calcReferralDiscount,
  setAppliedReferralCode,
} from '@/lib/referral'
import { useReferral } from '@/hooks/use-referral'

const ORDER_KEY = 'onramp:latest-order'

export function OnrampPageClient() {
  const router = useRouter()
  const { isConnected: storeConnected, publicKey } = useWallet()
  const {
    address,
    addresses,
    connected,
    loading,
    updateAddress,
    setDefaultAddress,
    removeAddress,
    disconnect,
  } =
    useWalletConnection()
  const walletConnected = Boolean(address) || connected || storeConnected || Boolean(publicKey)
  const referralWalletAddress = address || publicKey || ''
  const { discountActive, discountConsumed, consumeDiscount } = useReferral(referralWalletAddress)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false)
  const [rateOverride, setRateOverride] = useState(0)

  const form = useOnrampForm(rateOverride, walletConnected)
  const { data, countdown, warning, error, isLoading, displayRate, refresh, sparkline } = useExchangeRate(
    form.state.fiatCurrency,
    form.state.cryptoAsset
  )

  // Sync rate override when rate changes - using useEffect with proper async pattern
  useEffect(() => {
    if (data?.rate) {
      const timer = setTimeout(() => {
        setRateOverride(data.rate)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [data?.rate])

  // Reset rate override when currency or asset changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setRateOverride(0)
    }, 0)
    return () => clearTimeout(timer)
  }, [form.state.fiatCurrency, form.state.cryptoAsset])

  useEffect(() => {
    router.prefetch('/onramp/payment')
  }, [router])

  // Process referral code from URL query param (e.g. /onramp?ref=AFR-ABCD-1234)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const refCode = params.get('ref')
    if (refCode && !getAppliedReferralCode() && !discountConsumed) {
      setAppliedReferralCode(refCode.toUpperCase())
    }
  }, [discountConsumed])

  // Only show modal if definitely not connected after loading
  useEffect(() => {
    if (!loading && !walletConnected) {
      const timer = setTimeout(() => {
        // Double check after timeout to avoid flicker
        if (!walletConnected) {
          const timer2 = setTimeout(() => {
            setWalletModalOpen(true)
          }, 0)
          return () => clearTimeout(timer2)
        }
      }, 500)
      return () => clearTimeout(timer)
    } else if (walletConnected && walletModalOpen) {
      const timer = setTimeout(() => {
        setWalletModalOpen(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [loading, walletConnected, walletModalOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Show the confirmation summary first; the order is only created after
  // the user explicitly confirms in the dialog.
  const handleInitialSubmit = () => {
    if (!form.isValid || isSubmitting) return
    analytics.track('onramp_initiated', {
      amount: form.amountValue,
      fiatCurrency: form.state.fiatCurrency,
      cryptoAsset: form.state.cryptoAsset,
      paymentMethod: form.state.paymentMethod,
    })
    setShowConfirmDialog(true)
  }

  const handleSubmit = async () => {
    if (!isValidStellarAddress(address)) {
      setWalletModalOpen(true)
      return
    }

    const walletAddress = address

    if (!form.isValid || isSubmitting) {
      return
    }

    // Guard: refuse to create an order if the live exchange rate is unavailable.
    // Using a stale or hardcoded fallback rate would expose users or the platform
    // to incorrect pricing (see issue #271).
    if (!data?.rate) {
      alert(
        'Exchange rate is currently unavailable. Please wait for the rate to load or refresh the page before proceeding.'
      )
      return
    }

    setIsSubmitting(true)

    try {
      // Apply referral discount (10% off fees) on first ramp. Consumption is
      // reserved server-side up front so the one-time discount can't be
      // replayed by racing requests or clearing client-side state.
      const referralCode = getAppliedReferralCode()
      let hasDiscount = false
      if (referralCode && discountActive) {
        const consumeError = await consumeDiscount()
        hasDiscount = !consumeError
      }
      const reward = hasDiscount ? calcReferralDiscount(form.fees.totalFees) : null
      const discountedFees = reward
        ? {
            ...form.fees,
            totalFees: form.fees.totalFees - reward.discountAmount,
            totalCost: form.fees.totalCost - reward.discountAmount,
          }
        : form.fees

      const orderData = {
        id: `order-${Date.now()}`,
        fiatCurrency: form.state.fiatCurrency,
        cryptoAsset: form.state.cryptoAsset,
        paymentMethod: form.state.paymentMethod,
        amount: form.amountValue,
        exchangeRate: data.rate,
        cryptoAmount: form.cryptoAmount,
        fees: discountedFees,
        walletAddress: walletAddress,
        referralCode: hasDiscount ? referralCode : undefined,
      }

      const response = await fetch('/api/onramp/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        throw new Error('Failed to create order')
      }

      const result = await response.json()
      const order: OnrampOrder = result.order

      localStorage.setItem(ORDER_KEY, JSON.stringify(order))
      localStorage.setItem(`onramp:order:${order.id}`, JSON.stringify(order))

      analytics.track('onramp_order_created', {
        orderId: order.id,
        amount: order.amount,
        fiatCurrency: order.fiatCurrency,
        cryptoAsset: order.cryptoAsset,
        cryptoAmount: order.cryptoAmount,
        paymentMethod: order.paymentMethod,
        hasReferralDiscount: hasDiscount,
      })

      setShowConfirmDialog(false)

      // Follow correct workflow: Calculator → Payment Instructions → Processing → Success
      router.push(`/onramp/payment?order=${order.id}`)
    } catch (err) {
      console.error('Order creation failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisconnect = () => {
    setDisconnectModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 rounded-full" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
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

          <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/onramp" className="rounded-full px-3 py-2 bg-muted text-foreground">
              Onramp
            </Link>
            <Link href="/offramp" className="rounded-full px-3 py-2 hover:text-foreground">
              Offramp
            </Link>
            <Link href="/bills" className="rounded-full px-3 py-2 hover:text-foreground">
              Pay Bills
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <section className="text-center">
          <p className="text-sm font-semibold text-primary">Buy Crypto with Local Currency</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
            Convert your Naira, Shillings, or Cedis to stablecoins in seconds
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Fast, transparent conversion with real-time rates and clear fees.
          </p>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,620px)_1fr]">
          <OnrampCalculator
            amountInput={form.state.amountInput}
            fiatCurrency={form.state.fiatCurrency}
            cryptoAsset={form.state.cryptoAsset}
            paymentMethod={form.state.paymentMethod}
            exchangeRateLabel={displayRate}
            exchangeCountdown={countdown}
            exchangeWarning={warning}
            exchangeError={error}
            exchangeLoading={isLoading}
            exchangeSparkline={sparkline}
            onRefreshRate={refresh}
            onAmountChange={form.setAmountInput}
            onFiatChange={(value) => form.setFiatCurrency(value as FiatCurrency)}
            onCryptoChange={(value) => form.setCryptoAsset(value as CryptoAsset)}
            onPaymentChange={form.setPaymentMethod}
            onSubmit={handleInitialSubmit}
            onCopyWallet={handleCopy}
            onChangeWallet={updateAddress}
            onSetDefaultWallet={setDefaultAddress}
            onRemoveWallet={removeAddress}
            onDisconnectWallet={handleDisconnect}
            walletAddress={address}
            walletOptions={addresses}
            amountError={form.errors.amount}
            limits={form.limits}
            balanceLabel={`Balance: ${formatCurrency(250000, form.state.fiatCurrency, 0)} available`}
            cryptoAmount={form.cryptoAmount}
            isCalculating={form.isCalculating}
            isSubmitting={isSubmitting}
            isValid={form.isValid}
            fees={form.fees}
          />

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-muted/20 p-6">
              <h3 className="text-lg font-semibold text-foreground">Why cNGN?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Stablecoins on Stellar settle faster, cost less, and let you swap directly into USDC
                or XLM anytime.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>• Transfers complete in seconds</li>
                <li>• Swap to other assets instantly</li>
                <li>• Send across borders without bank delays</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6">
              <h4 className="text-sm font-semibold text-foreground">Fee Summary</h4>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Processing fee</span>
                  <span className="text-foreground">{processingFeeLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network fee</span>
                  <span className="text-foreground">
                    {formatCurrency(form.fees.networkFee, form.state.fiatCurrency)}
                  </span>
                </div>
                {discountActive && (
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <span>Referral discount (10%)</span>
                    <span>
                      −{formatCurrency(form.fees.totalFees * 0.1, form.state.fiatCurrency)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3 text-foreground">
                  <span>Total cost</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      discountActive
                        ? form.fees.totalCost - form.fees.totalFees * 0.1
                        : form.fees.totalCost,
                      form.state.fiatCurrency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RecentTransactions />
      </main>

      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet not connected</DialogTitle>
            <DialogDescription>
              Please connect a Stellar wallet before continuing. You can reconnect from the landing
              page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push('/')}>Go to Home</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={disconnectModalOpen} onOpenChange={setDisconnectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect wallet?</DialogTitle>
            <DialogDescription>
              You will need to reconnect your wallet to continue the onramp flow.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDisconnectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                disconnect()
                setDisconnectModalOpen(false)
              }}
            >
              Disconnect
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && <OnrampTestUtils />}
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm your order</DialogTitle>
            <DialogDescription>
              Review the details below. Your order will only be created after you confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">You are paying</span>
              <span className="font-medium">
                {formatCurrency(form.fees.totalCost, form.state.fiatCurrency)}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">You will receive</span>
              <span className="font-medium text-primary">
                {form.cryptoAmount} {form.state.cryptoAsset}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Exchange rate</span>
              <div className="text-right">
                <div className="font-medium">
                  1 {form.state.cryptoAsset} ={' '}
                  {formatCurrency(data?.rate || 0, form.state.fiatCurrency)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {countdown > 0 ? `Rate updates in ${countdown}s` : 'Refreshing rate…'}
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Processing fee</span>
              <span className="font-medium">{processingFeeLabel}</span>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Network fee</span>
              <span className="font-medium">
                {formatCurrency(form.fees.networkFee, form.state.fiatCurrency)}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Destination address</span>
              <span className="max-w-[200px] break-all text-right text-xs font-medium">
                {address || 'Connect wallet'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-muted-foreground">Estimated completion</span>
              <span className="font-medium">A few seconds</span>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Processing…' : 'Confirm and Pay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
