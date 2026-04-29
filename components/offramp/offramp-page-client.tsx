'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectButton } from '@/components/Wallet'
import { OfframpCalculator } from '@/components/offramp/offramp-calculator'
import { useWallet } from '@/hooks/useWallet'
import { useOfframpRate } from '@/hooks/use-offramp-rate'
import { useOfframpForm } from '@/hooks/use-offramp-form'
import { useOfframpBalances } from '@/hooks/use-offramp-balances'
import { formatCurrency } from '@/lib/onramp/formatters'
import { formatUsd, formatRateCountdown } from '@/lib/offramp/formatters'
import type { OfframpOrder } from '@/types/offramp'

const ORDER_KEY = 'offramp:latest-order'
const LOCK_KEY = 'offramp:rate-lock'

const assetUsdRates: Record<string, number> = {
  cNGN: 0.00063,
  USDC: 1,
  USDT: 1,
  XLM: 0.12,
}

export function OfframpPageClient() {
  const router = useRouter()
  const { publicKey, isConnecting } = useWallet()
  const address = publicKey || ''
  const loading = isConnecting
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null)
  const [rateOverride, setRateOverride] = useState(0)

  const { options: assetOptions } = useOfframpBalances(address)
  const form = useOfframpForm(assetOptions, rateOverride)
  const selectedAsset = form.selectedAsset
  const { rate, countdown, lastUpdated, isLoading, refresh } = useOfframpRate(
    selectedAsset.asset,
    selectedAsset.chain
  )

  useEffect(() => {
    if (rate) {
      Promise.resolve().then(() => setRateOverride(rate))
    }
  }, [rate])

  useEffect(() => {
    const stored = localStorage.getItem(LOCK_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as { expiresAt: number }
      if (parsed.expiresAt > Date.now()) {
        Promise.resolve().then(() => setLockExpiresAt(parsed.expiresAt))
      }
    }
  }, [])

  useEffect(() => {
    router.prefetch('/offramp/bank-details')
  }, [router])

  const [, setLockCountdownTick] = useState(0)

  useEffect(() => {
    if (!lockExpiresAt) return

    const interval = setInterval(() => {
      setLockCountdownTick((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [lockExpiresAt])

  const lockCountdown = useMemo(() => {
    if (!lockExpiresAt) return null
    const seconds = Math.max(Math.floor((lockExpiresAt - new Date().getTime()) / 1000), 0)
    return seconds
  }, [lockExpiresAt])

  const usdEquivalent = useMemo(() => {
    const usdRate = assetUsdRates[selectedAsset.asset]
    return form.amountValue > 0 ? form.amountValue * usdRate : 0
  }, [form.amountValue, selectedAsset.asset])

  const handleSubmit = () => {
    if (!form.isValid) return

    const lockExpires = Date.now() + 15 * 60 * 1000
    setLockExpiresAt(lockExpires)
    localStorage.setItem(LOCK_KEY, JSON.stringify({ expiresAt: lockExpires }))

    const order: OfframpOrder = {
      id: `offramp-${Date.now()}`,
      createdAt: Date.now(),
      lockExpiresAt: lockExpires,
      assetId: selectedAsset.id,
      asset: selectedAsset.asset,
      chain: selectedAsset.chain,
      amount: parseFloat(form.state.amountInput.replace(/,/g, '')) || 0,
      fiatCurrency: form.state.fiatCurrency,
      rate,
      fiatAmount: form.fiatAmount,
      fees: form.fees,
      status: 'pending_bank_details',
    }

    localStorage.setItem(ORDER_KEY, JSON.stringify(order))
    localStorage.setItem(`offramp:order:${order.id}`, JSON.stringify(order))
    router.push(`/offramp/bank-details?order=${order.id}`)
  }

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
            <Link href="/onramp" className="rounded-full px-3 py-2 hover:text-foreground">
              Onramp
            </Link>
            <Link href="/offramp" className="rounded-full px-3 py-2 bg-muted text-foreground">
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
          <p className="text-sm font-semibold text-primary">Sell Crypto for Local Currency</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
            Cash out your stablecoins and crypto with transparent fees
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Real-time rates, liquidity checks, and fast bank transfers.
          </p>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,620px)_1fr]">
          <OfframpCalculator
            options={assetOptions}
            assetId={form.state.assetId}
            amountInput={form.state.amountInput}
            fiatCurrency={form.state.fiatCurrency}
            rate={rate}
            rateCountdown={countdown}
            rateUpdatedAt={lastUpdated || 0}
            isRateLoading={isLoading}
            fiatAmount={form.fiatAmount}
            usdEquivalent={usdEquivalent}
            fees={form.fees}
            errors={form.errors}
            limits={form.limits}
            isCalculating={form.isCalculating}
            isValid={form.isValid}
            lockCountdown={lockCountdown}
            onAssetChange={form.setAssetId}
            onAmountChange={form.setAmountInput}
            onMax={form.setMaxAmount}
            onFiatChange={form.setFiatCurrency}
            onRefreshRate={refresh}
            onSubmit={handleSubmit}
          />

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-muted/20 p-6">
              <h3 className="text-lg font-semibold text-foreground">Liquidity Status</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Available liquidity for {form.state.fiatCurrency}:{' '}
                {formatCurrency(1500000, form.state.fiatCurrency)}
              </p>
              <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Large withdrawals above {formatCurrency(1000000, form.state.fiatCurrency)} may take
                longer to settle.
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6">
              <h4 className="text-sm font-semibold text-foreground">Estimated Payout</h4>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Crypto sold</span>
                  <span className="text-foreground">
                    {form.state.amountInput || '0'} {selectedAsset.asset}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>USD equivalent</span>
                  <span className="text-foreground">{formatUsd(usdEquivalent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rate lock</span>
                  <span className="text-foreground">
                    {lockCountdown !== null
                      ? formatRateCountdown(lockCountdown)
                      : '15:00 on submit'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-foreground">
                  <span>You receive</span>
                  <span className="font-semibold">
                    {formatCurrency(form.fees.receiveAmount, form.state.fiatCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
