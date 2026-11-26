'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getLoginPath, type PaymentIntent } from '@/lib/payment-intent'

const directions: { label: string; intent: PaymentIntent }[] = [
  { label: 'Spend', intent: 'spend' },
  { label: 'Buy', intent: 'buy' },
]

export function AmountWidget() {
  const router = useRouter()
  const [intent, setIntent] = useState<PaymentIntent>('spend')
  const [amount, setAmount] = useState('')

  // Nothing to act on yet without an amount — signing in happens once
  // there's a real payment to continue with.
  const canContinue = Number(amount) > 0

  return (
    <div className="bg-white dark:bg-surface w-full max-w-[420px] overflow-hidden rounded-xl shadow-lg">
      <div role="group" aria-label="Payment direction" className="grid grid-cols-2">
        {directions.map(({ label, intent: directionIntent }) => (
          <button
            key={directionIntent}
            type="button"
            aria-pressed={intent === directionIntent}
            onClick={() => setIntent(directionIntent)}
            className={cn(
              'py-3 text-sm transition-colors',
              intent === directionIntent
                ? 'text-charcoal dark:text-white bg-white dark:bg-surface font-medium'
                : 'text-charcoal/70 dark:text-white/60 bg-mint dark:bg-band'
            )}
          >
            {label}
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
          onChange={(e) => setAmount(e.target.value)}
          className="text-charcoal dark:text-white placeholder:text-charcoal/40 dark:placeholder:text-white/40 min-w-0 flex-1 bg-transparent text-lg outline-none"
        />

        <span className="bg-mint dark:bg-band text-charcoal dark:text-white flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm">
          <span aria-hidden="true">🇳🇬</span>
          NGN
        </span>

        <button
          type="button"
          aria-label={`Continue to ${intent}`}
          disabled={!canContinue}
          onClick={() => router.replace(getLoginPath(intent))}
          className="bg-brand-deep flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
