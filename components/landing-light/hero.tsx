import Image from 'next/image'

import { AmountWidget } from '@/components/landing-light/amount-widget'
import { SiteNav } from '@/components/landing-light/site-nav'
import { hero } from '@/lib/landing-light-data'

export function Hero() {
  return (
    <section className="bg-brand">
      <SiteNav />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-16 pb-24 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-4xl leading-[1.15] font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {hero.titleBefore}{' '}
            <span className="bg-brand-deep box-decoration-clone px-3 py-1">
              {hero.titleHighlight}
            </span>{' '}
            {hero.titleAfter}
          </h1>

          <p className="mt-6 max-w-md text-base text-white/90">{hero.blurb}</p>

          <h2 className="mt-10 text-xl font-bold text-white">{hero.amountLabel}</h2>
          <div className="mt-4">
            <AmountWidget />
          </div>
        </div>

        {/* Lifted from the design export — the render sits on the same
            brand green, so its transparent edges blend exactly. */}
        <Image
          src="/landing/hero-coins.png"
          alt=""
          aria-hidden="true"
          width={705}
          height={835}
          priority
          sizes="(min-width: 1024px) 460px, 0px"
          className="hidden h-auto w-full max-w-[460px] justify-self-end lg:block"
        />
      </div>
    </section>
  )
}
