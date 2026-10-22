import { FileCode2, ShieldCheck, Sparkle } from 'lucide-react'

import { trust } from '@/lib/landing-light-data'

const icons = [Sparkle, ShieldCheck, FileCode2]

export function Trust() {
  return (
    <section id="trust" className="bg-white dark:bg-surface px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <span className="bg-brand/15 text-brand-deep dark:text-brand inline-block rounded-full px-3 py-1 text-xs">
          {trust.eyebrow}
        </span>
        <h2 className="text-charcoal dark:text-white mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          {trust.title}
        </h2>
        <p className="text-charcoal/70 dark:text-white/70 mt-3 max-w-xl text-sm leading-relaxed">
          {trust.blurb}
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {trust.items.map(({ title, blurb, linkLabel, href }, i) => {
            const Icon = icons[i % icons.length]
            return (
              <div
                key={title}
                className="border-black/5 dark:border-edge bg-white dark:bg-band flex flex-col rounded-2xl border p-6"
              >
                <span className="bg-brand/15 flex size-10 items-center justify-center rounded-full">
                  <Icon className="text-brand-deep dark:text-brand size-5" />
                </span>
                <h3 className="text-charcoal dark:text-white mt-5 font-bold">{title}</h3>
                <p className="text-charcoal/70 dark:text-white/70 mt-2 flex-1 text-sm leading-relaxed">
                  {blurb}
                </p>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-deep dark:text-brand mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
                >
                  {linkLabel}
                  <span aria-hidden="true">&rarr;</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
