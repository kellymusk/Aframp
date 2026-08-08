'use client'

import { CountryFlag } from '@/components/icons/finance-icons'
import { cn } from '@/lib/utils'
import {
  OFFRAMP_COUNTRIES,
  OFFRAMP_COUNTRY_CODES,
  type OfframpCountryCode,
} from '@/lib/offramp/countries'

interface CountrySelectProps {
  value: OfframpCountryCode
  onChange: (code: OfframpCountryCode) => void
  disabled?: boolean
  className?: string
  id?: string
}

/**
 * Destination country for an offramp payout.
 *
 * A native select: five options need no search, and it gets keyboard handling
 * and the platform picker on mobile for free.
 */
export function CountrySelect({ value, onChange, disabled, className, id }: CountrySelectProps) {
  const selected = OFFRAMP_COUNTRIES[value]

  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
        <CountryFlag code={selected.code} className="h-5 w-5" />
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as OfframpCountryCode)}
        aria-label="Payout country"
        className="h-14 w-full appearance-none rounded-xl border border-border bg-background pl-12 pr-10 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {OFFRAMP_COUNTRY_CODES.map((code) => {
          const country = OFFRAMP_COUNTRIES[code]
          return (
            <option key={code} value={code}>
              {country.name} ({country.currency})
            </option>
          )
        })}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  )
}
