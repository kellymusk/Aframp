import { BadgeCheck, Banknote, Gauge, Lock, ShieldCheck, Wallet2 } from 'lucide-react'

import { features } from '@/lib/landing-light-data'

const icons = [Gauge, Wallet2, Lock, Banknote, ShieldCheck, BadgeCheck]

export function Features() {
  return (
    <section id="features" className="bg-white dark:bg-surface px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-brand-deep dark:text-brand text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Built for how Africa actually pays
        </h2>
        <p className="text-charcoal/70 dark:text-white/70 mx-auto mt-3 max-w-xl text-center text-sm">
          A handful of things we get right so you don&apos;t have to think about them.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, blurb, metric }, i) => {
            const Icon = icons[i % icons.length]
            return (
              <div
                key={title}
                className="border-black/5 dark:border-edge bg-white dark:bg-band rounded-2xl border p-6"
              >
                <span className="bg-brand/15 flex size-10 items-center justify-center rounded-full">
                  <Icon className="text-brand-deep dark:text-brand size-5" />
                </span>
                <h3 className="text-charcoal dark:text-white mt-5 font-bold">{title}</h3>
                <p className="text-charcoal/70 dark:text-white/70 mt-2 text-sm leading-relaxed">
                  {blurb}
                </p>
                {metric && (
                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="text-brand-deep dark:text-brand text-lg font-bold">
                      {metric.value}
                    </span>
                    <span className="text-charcoal/60 dark:text-dim text-xs">{metric.label}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
