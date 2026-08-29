'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

const tabs = ['Spend', 'Buy'] as const
type Tab = (typeof tabs)[number]

type RateState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; rate: number; updatedAt: string }

export function AmountWidget() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('Spend')
  const [amount, setAmount] = useState('')
  const [rateState, setRateState] = useState<RateState>({ status: 'loading' })
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ Spend: null, Buy: null })

  // Nothing to act on yet without an amount — signing in happens once
  // there's a real payment to continue with.
  const canContinue = Number(amount) > 0

  useEffect(() => {
    let cancelled = false

    async function loadRate() {
      try {
        const res = await fetch('/api/rate', { cache: 'no-store' })
        if (!res.ok) throw new Error('rate request failed')
        const data = (await res.json()) as { rate: number; updatedAt: string }
        if (!cancelled) setRateState({ status: 'ready', rate: data.rate, updatedAt: data.updatedAt })
      } catch {
        if (!cancelled) setRateState({ status: 'error' })
      }
    }

    loadRate()
    return () => {
      cancelled = true
    }
  }, [])

  // Roving-tabindex arrow-key navigation per the WAI-ARIA tabs pattern —
  // Tab lands on the active tab only, Left/Right move between the two.
  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const currentIndex = tabs.indexOf(tab)
    const nextIndex =
      e.key === 'ArrowRight'
        ? (currentIndex + 1) % tabs.length
        : (currentIndex - 1 + tabs.length) % tabs.length
    const nextTab = tabs[nextIndex]
    setTab(nextTab)
    tabRefs.current[nextTab]?.focus()
  }

  return (
    <div className="animate-widget-in w-full max-w-[420px] overflow-hidden rounded-xl bg-white shadow-lg dark:bg-surface">
      <div role="tablist" aria-label="Payment direction" className="grid grid-cols-2">
        {tabs.map((t) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[t] = el
            }}
            id={`amount-widget-tab-${t}`}
            role="tab"
            type="button"
            aria-selected={tab === t}
            aria-controls="amount-widget-panel"
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={onTabKeyDown}
            className={cn(
              'py-3 text-sm transition-colors',
              tab === t
                ? 'text-charcoal dark:text-white bg-white dark:bg-surface font-medium'
                : 'text-charcoal/70 dark:text-white/60 bg-mint dark:bg-band'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        id="amount-widget-panel"
        role="tabpanel"
        aria-labelledby={`amount-widget-tab-${tab}`}
        className="border-black/5 dark:border-edge flex items-center gap-3 border-t px-4 py-3"
      >
        <span className="text-charcoal dark:text-white text-lg">₦</span>
        <label htmlFor="amount" className="sr-only">
          Amount in naira
        </label>
        <input
          id="amount"
          inputMode="decimal"
          placeholder="0.00"
          aria-describedby="amount-widget-rate"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-charcoal dark:text-white placeholder:text-charcoal/40 dark:placeholder:text-white/40 min-w-0 flex-1 bg-transparent text-lg outline-none"
        />

        <span className="bg-mint dark:bg-band text-charcoal dark:text-white flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm">
          <span aria-hidden="true">🇳🇬</span>
          NGN
        </span>

        <button
          type="button"
          aria-label={`Continue to ${tab.toLowerCase()}`}
          disabled={!canContinue}
          onClick={() => router.replace('/login')}
          className="bg-brand-deep flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <p
        id="amount-widget-rate"
        aria-live="polite"
        className="text-charcoal/60 dark:text-white/60 border-black/5 dark:border-edge border-t px-4 py-2 text-[11px]"
      >
        {rateState.status === 'loading' && 'Fetching live rate…'}
        {rateState.status === 'error' && 'Live rate unavailable — showing 1 cNGN = ₦1.00'}
        {rateState.status === 'ready' &&
          `1 cNGN = ₦${rateState.rate.toFixed(4)} · updated ${new Date(
            rateState.updatedAt
          ).toLocaleTimeString()}`}
      </p>
    </div>
  )
}
