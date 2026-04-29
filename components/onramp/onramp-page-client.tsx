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
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { useOnrampForm } from '@/hooks/use-onramp-form'
import { useWalletConnection } from '@/hooks/use-wallet-connection'
import { OnrampTestUtils } from '@/components/onramp/onramp-test-utils'
import type { CryptoAsset, FiatCurrency } from '@/types/onramp'
import { formatCurrency } from '@/lib/onramp/formatters'
import { isValidStellarAddress } from '@/lib/onramp/validation'
import type { OnrampOrder } from '@/types/onramp'
import { Button } from '@/components/ui/button' // Added missing import for Button

const ORDER_KEY = 'onramp:latest-order'

export function OnrampPageClient() {
  const router = useRouter()
  const { isConnected: storeConnected, publicKey } = useWallet()
  const { address, addresses, connected, loading, updateAddress, disconnect } =
    useWalletConnection()
  const walletConnected = Boolean(address) || connected || storeConnected || Boolean(publicKey)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false)
  const [rateOverride, setRateOverride] = useState(0)

  const form = useOnrampForm(rateOverride, walletConnected)
  const { data, countdown, warning, error, isLoading, displayRate, refresh } = useExchangeRate(
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

  const handleSubmit = () => {
    // For demo purposes, auto-connect a mock wallet if none exists
    let walletAddress = address
    if (!isValidStellarAddress(address)) {
      const mockAddress = 'GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFG'
      updateAddress(mockAddress)
      walletAddress = mockAddress
    }

    if (!form.isValid) {
      return
    }

    const order: OnrampOrder = {
      id: `order-${Date.now()}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      fiatCurrency: form.state.fiatCurrency,
      cryptoAsset: form.state.cryptoAsset,
      paymentMethod: form.state.paymentMethod,
      amount: form.amountValue,
      exchangeRate: data?.rate || 1600, // Fallback rate for demo
      cryptoAmount: form.cryptoAmount,
      fees: form.fees,
      walletAddress: walletAddress,
      status: 'created',
    }

    localStorage.setItem(ORDER_KEY, JSON.stringify(order))
    localStorage.setItem(`onramp:order:${order.id}`, JSON.stringify(order))

    // Follow correct workflow: Calculator → Payment Instructions → Processing → Success
    router.push(`/onramp/payment?order=${order.id}`)
  }

  const handleDisconnect = () => {
    setDisconnectModalOpen(true)
  }

  const processingFeeLabel =
    form.state.paymentMethod === 'bank_transfer'
      ? 'FREE'
      : form.state.paymentMethod === 'card'
        ? `${formatCurrency(form.fees.processingFee, form.state.fiatCurrency)} (1.5%)`
        : `${formatCurrency(form.fees.processingFee, form.state.fiatCurrency)} (0.5%)`

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-full bg-muted" />
            <div className="h-64 rounded-3xl bg-muted" />
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
            onRefreshRate={refresh}
            onAmountChange={form.setAmountInput}
            onFiatChange={(value) => form.setFiatCurrency(value as FiatCurrency)}
            onCryptoChange={(value) => form.setCryptoAsset(value as CryptoAsset)}
            onPaymentChange={form.setPaymentMethod}
            onSubmit={handleSubmit}
            onCopyWallet={handleCopy}
            onChangeWallet={updateAddress}
            onDisconnectWallet={handleDisconnect}
            walletAddress={address}
            walletOptions={addresses}
            amountError={form.errors.amount}
            limits={form.limits}
            balanceLabel={`Balance: ${formatCurrency(250000, form.state.fiatCurrency, 0)} available`}
            cryptoAmount={form.cryptoAmount}
            isCalculating={form.isCalculating}
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
                <div className="flex items-center justify-between border-t border-border pt-3 text-foreground">
                  <span>Total cost</span>
                  <span className="font-semibold">
                    {formatCurrency(form.fees.totalCost, form.state.fiatCurrency)}
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

          {/* Test Utils - Remove in production */}
          <OnrampTestUtils />
        </DialogContent>
      </Dialog>
    </div>
  )
}
