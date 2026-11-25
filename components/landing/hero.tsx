import { ArrowRight, CreditCard, Wallet, Zap } from 'lucide-react'

import { hero } from '@/lib/landing-data'

function HeroCard() {
  const { card } = hero

  return (
    <div className="relative">
      <div className="border-edge bg-surface/60 rounded-3xl border p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="bg-brand/15 flex size-12 shrink-0 items-center justify-center rounded-full">
            <Wallet className="text-brand size-6" />
          </span>
          <div>
            <p className="text-dim text-sm">{card.balanceLabel}</p>
            <p className="text-2xl font-bold tracking-tight text-white">{card.balance}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Buy Crypto', icon: Wallet },
            { label: 'Pay Bills', icon: CreditCard },
            { label: 'Send', icon: ArrowRight },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="bg-band/80 flex flex-col items-center gap-2 rounded-2xl px-2 py-5"
            >
              <Icon className="text-brand size-5" />
              <span className="text-center text-xs text-white">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating proof-of-life cards, as in the design. */}
      <div className="bg-brand absolute -top-6 -right-2 rounded-2xl px-5 py-4 text-black shadow-lg sm:-right-6">
        <p className="text-sm font-medium">{card.purchase.label}</p>
        <p className="text-xl font-bold tracking-tight">{card.purchase.amount}</p>
        <p className="text-xs opacity-70">{card.purchase.sub}</p>
      </div>

      <div className="border-edge bg-band absolute -bottom-8 -left-2 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg sm:-left-10">
        <span className="bg-brand/15 flex size-9 shrink-0 items-center justify-center rounded-full">
          <CreditCard className="text-brand size-4" />
        </span>
        <div className="text-sm">
          <div className="flex items-center gap-4">
            <span className="font-medium text-white">{card.toast.title}</span>
            <span className="ml-auto font-medium text-white">{card.toast.amount}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-dim text-xs">{card.toast.status}</span>
            <span className="text-brand ml-auto text-xs">{card.toast.token}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pt-24 pb-20 lg:grid-cols-2 lg:pt-32">
      <div>
        <span className="border-brand/40 bg-brand/10 text-brand inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs">
          <span className="bg-brand size-1.5 rounded-full" />
          {hero.eyebrow}
        </span>

        <h1 className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-6xl">
          {hero.titleTop}
          <br />
          <span className="text-brand">{hero.titleAccent}</span>
        </h1>

        <p className="text-dim mt-6 max-w-md text-base leading-relaxed">
          Buy crypto from as low as <strong className="font-bold text-white">{hero.minBuy}</strong>.
          Pay bills, send money, and grow your business with Africa&apos;s first stablecoin payment
          platform.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/login"
            className="bg-brand flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            <Wallet className="size-4" />
            Connect Wallet
          </a>
          <a
            href="#features"
            className="border-edge bg-surface flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/5"
          >
            <Zap className="size-4" />
            Swap Tokens
          </a>
        </div>

        <dl className="divide-edge mt-12 flex divide-x">
          {hero.stats.map(({ value, label }, i) => (
            <div key={label} className={i === 0 ? 'pr-8' : 'px-8'}>
              <dt className="text-2xl font-bold tracking-tight text-white">{value}</dt>
              <dd className="text-dim mt-0.5 text-xs">{label}</dd>
            </div>
          ))}
        </dl>

        {hero.stats.some((stat) => stat.illustrative) && (
          <p className="text-dim mt-3 text-xs">
            Illustrative figures, not verified platform metrics.
          </p>
        )}
      </div>

      <div className="lg:pl-8">
        <HeroCard />
      </div>
    </section>
  )
}
