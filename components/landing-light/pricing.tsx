'use client'

import { useEffect, useState } from 'react'

import { pricingIntro } from '@/lib/landing-light-data'
import { countryPricing, inferCountryFromLocale, type CountryCode } from '@/lib/landing-pricing-data'

export function Pricing() {
  const [country, setCountry] = useState<CountryCode>('NG')

  // Browser locale isn't known during SSR, so the dropdown renders with the
  // Nigeria default and this effect corrects it client-side on mount.
  useEffect(() => {
    setCountry(inferCountryFromLocale())
  }, [])

  const selected = countryPricing.find((c) => c.code === country) ?? countryPricing[0]

  return (
    <section id="pricing" className="bg-mint dark:bg-band px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <span className="bg-brand/15 text-brand-deep dark:text-brand inline-block rounded-full px-3 py-1 text-xs">
          {pricingIntro.eyebrow}
        </span>
        <h2 className="text-charcoal dark:text-white mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {pricingIntro.title}
        </h2>
        <p className="text-charcoal/70 dark:text-white/70 mt-3 text-sm leading-relaxed">
          {pricingIntro.blurb}
        </p>

        <div className="mt-8 flex items-center gap-3">
          <label
            htmlFor="pricing-country"
            className="text-charcoal dark:text-white text-sm font-medium"
          >
            Country
          </label>
          <select
            id="pricing-country"
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className="border-black/10 dark:border-edge text-charcoal dark:text-white bg-white dark:bg-surface rounded-lg border px-3 py-2 text-sm outline-none"
          >
            {countryPricing.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="border-black/5 dark:border-edge bg-white dark:bg-surface mt-6 overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Payment fees for {selected.name} ({selected.currency})
            </caption>
            <thead>
              <tr className="border-black/5 dark:border-edge border-b">
                <th className="text-charcoal/60 dark:text-dim px-5 py-3 font-medium">
                  Payment method
                </th>
                <th className="text-charcoal/60 dark:text-dim px-5 py-3 font-medium">Fee</th>
              </tr>
            </thead>
            <tbody>
              {selected.rows.map(({ method, fee, note }) => (
                <tr key={method} className="border-black/5 dark:border-edge border-b last:border-0">
                  <td className="text-charcoal dark:text-white px-5 py-3.5">
                    {method}
                    {note && (
                      <span className="text-charcoal/50 dark:text-dim ml-2 text-xs">{note}</span>
                    )}
                  </td>
                  <td className="text-brand-deep dark:text-brand px-5 py-3.5 font-bold">{fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-charcoal/50 dark:text-white/50 mt-3 text-xs">
          Fees shown in {selected.currency}-denominated transactions for {selected.name}. Rates are
          illustrative and subject to change.
        </p>
      </div>
    </section>
  )
}
