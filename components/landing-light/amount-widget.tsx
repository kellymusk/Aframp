'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

const tabs = ['Spend', 'Buy'] as const

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$|^\.\d{1,2}$/

export function AmountWidget() {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Spend')
  const [amount, setAmount] = useState('')
  const [rejected, setRejected] = useState(false)

  // Nothing to act on yet without an amount — signing in happens once
  // there's a real payment to continue with. The strict pattern rejects
  // '1e2', 'Infinity' and the like that Number() would accept.
  const canContinue = AMOUNT_PATTERN.test(amount) && Number(amount) > 0

  function handleChange(raw: string) {
    // Keep digits and the first decimal point only, with at most 2 decimals.
    const cleaned = raw.replace(/[^0-9.]/g, '')
    const [whole, ...rest] = cleaned.split('.')
    const next = rest.length > 0 ? `${whole}.${rest.join('').slice(0, 2)}` : whole
    setRejected(next !== raw)
    setAmount(next)
  }

  return (
    <div className="bg-white dark:bg-surface w-full max-w-[420px] overflow-hidden rounded-xl shadow-lg">
      <div role="tablist" aria-label="Payment direction" className="grid grid-cols-2">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
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

      <div className="border-black/5 dark:border-edge flex items-center gap-3 border-t px-4 py-3">
        <span className="text-charcoal dark:text-white text-lg">₦</span>
        <label htmlFor="amount" className="sr-only">
          Amount in naira
        </label>
        <input
          id="amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          aria-invalid={rejected}
          aria-describedby={rejected ? 'amount-error' : undefined}
          onChange={(e) => handleChange(e.target.value)}
          className="text-charcoal dark:text-white placeholder:text-charcoal/40 dark:placeholder:text-white/40 min-w-0 flex-1 rounded-sm bg-transparent text-lg outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
      {rejected && (
        <p id="amount-error" role="alert" className="px-4 pb-3 text-xs text-red-600">
          Enter a valid amount using numbers only, with up to 2 decimal places.
        </p>
      )}
    </div>
  )
}
