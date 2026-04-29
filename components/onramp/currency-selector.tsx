'use client'

import type { FiatCurrency, CryptoAsset } from '@/types/onramp'
import { cn } from '@/lib/utils'
import { CountryFlag, CryptoAssetBadge } from '@/components/icons/finance-icons'

const fiatOptions: { value: FiatCurrency; label: string; countryCode: string }[] = [
  { value: 'NGN', label: 'Nigerian Naira', countryCode: 'NG' },
  { value: 'KES', label: 'Kenyan Shilling', countryCode: 'KE' },
  { value: 'GHS', label: 'Ghanaian Cedi', countryCode: 'GH' },
  { value: 'ZAR', label: 'South African Rand', countryCode: 'ZA' },
  { value: 'UGX', label: 'Ugandan Shilling', countryCode: 'UG' },
]

const cryptoOptions: { value: CryptoAsset; label: string }[] = [
  { value: 'cNGN', label: 'cNGN' },
  { value: 'cKES', label: 'cKES' },
  { value: 'cGHS', label: 'cGHS' },
  { value: 'USDC', label: 'USDC' },
  { value: 'XLM', label: 'XLM' },
]

interface CurrencySelectorProps {
  variant: 'fiat' | 'crypto'
  value: FiatCurrency | CryptoAsset
  onChange: (value: FiatCurrency | CryptoAsset) => void
  className?: string
}

export function CurrencySelector({ variant, value, onChange, className }: CurrencySelectorProps) {
  const options = variant === 'fiat' ? fiatOptions : cryptoOptions
  const selected = options.find((option) => option.value === value) || options[0]

  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        {variant === 'fiat' ? (
          <CountryFlag code={(selected as (typeof fiatOptions)[number]).countryCode} className="h-5 w-5" />
        ) : (
          <CryptoAssetBadge asset={value as CryptoAsset} className="h-5 w-5 text-[9px]" />
        )}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as FiatCurrency | CryptoAsset)}
        className="h-[52px] w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-10 py-3 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={variant === 'fiat' ? 'Select fiat currency' : 'Select crypto asset'}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
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
