'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type OnboardingStep = 'wallet' | 'charge' | 'payment' | 'cashout'

export type OnboardingProgress = Record<OnboardingStep, boolean>

const STEPS: { key: OnboardingStep; label: string; hint: string; href: string }[] = [
  {
    key: 'wallet',
    label: 'Set up your wallet',
    hint: 'Get the address customers pay into.',
    href: '/wallet',
  },
  {
    key: 'charge',
    label: 'Create your first charge',
    hint: 'Enter an amount and show the customer the code.',
    href: '/charge',
  },
  {
    key: 'payment',
    label: 'Receive your first payment',
    hint: 'It appears here as soon as it confirms.',
    href: '/transactions',
  },
  {
    key: 'cashout',
    label: 'Cash out to your bank',
    hint: 'Move cNGN to a Nigerian bank account.',
    href: '/withdraw',
  },
]

/**
 * Getting-started steps, ticked off from the merchant's real activity (the
 * caller derives `progress` from the API). Hidden once every step is done.
 */
export function OnboardingChecklist({ progress }: { progress: OnboardingProgress }) {
  const doneCount = STEPS.filter((step) => progress[step.key]).length
  if (doneCount === STEPS.length) return null

  const nextStep = STEPS.find((step) => !progress[step.key])

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="bg-panel border-hairline w-full rounded-2xl border p-5 md:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand text-xs font-medium tracking-[0.2em] uppercase">
            Getting started
          </p>
          <h2 id="onboarding-heading" className="mt-2 text-xl font-bold text-white">
            Start taking payments
          </h2>
        </div>
        <p className="text-dim text-sm">
          {doneCount} of {STEPS.length} done
        </p>
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => {
          const completed = progress[step.key]
          const isNext = step.key === nextStep?.key
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                aria-label={`${step.label}${completed ? ' (done)' : ''}`}
                className={cn(
                  'group flex h-full items-start gap-3 rounded-xl border p-3 transition-colors',
                  isNext
                    ? 'border-brand/50 bg-brand/5 hover:bg-brand/10'
                    : 'border-hairline hover:bg-raised'
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    completed ? 'text-brand' : 'bg-raised text-dim'
                  )}
                >
                  {completed ? <CheckCircle2 className="size-5" aria-hidden /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      completed ? 'text-dim line-through' : 'text-white'
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-dim mt-0.5 block text-xs">
                    {completed ? 'Done' : step.hint}
                  </span>
                </span>
                {!completed && (
                  <ArrowRight
                    className="text-dim group-hover:text-brand mt-1 size-4 shrink-0"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
