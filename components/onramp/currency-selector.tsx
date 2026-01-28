'use client'

import type { FiatCurrency, CryptoAsset } from '@/types/onramp'
import { cn } from '@/lib/utils'

const fiatOptions: { value: FiatCurrency; label: string; flag: string }[] = [
  { value: 'NGN', label: 'Nigerian Naira', flag: '🇳🇬' },
  { value: 'KES', label: 'Kenyan Shilling', flag: '🇰🇪' },
  { value: 'GHS', label: 'Ghanaian Cedi', flag: '🇬🇭' },
  { value: 'ZAR', label: 'South African Rand', flag: '🇿🇦' },
  { value: 'UGX', label: 'Ugandan Shilling', flag: '🇺🇬' },
]

const cryptoOptions: { value: CryptoAsset; label: string; icon: string }[] = [
  { value: 'cNGN', label: 'cNGN', icon: '💵' },
  { value: 'cKES', label: 'cKES', icon: '💵' },
  { value: 'cGHS', label: 'cGHS', icon: '💵' },
  { value: 'USDC', label: 'USDC', icon: '🪙' },
  { value: 'XLM', label: 'XLM', icon: '✨' },
]

interface CurrencySelectorProps {
  variant: 'fiat' | 'crypto'
  value: FiatCurrency | CryptoAsset
  onChange: (value: FiatCurrency | CryptoAsset) => void
  className?: string
}

export function CurrencySelector({ variant, value, onChange, className }: CurrencySelectorProps) {
  const options = variant === 'fiat' ? fiatOptions : cryptoOptions

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as FiatCurrency | CryptoAsset)}
        className="h-[52px] w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={variant === 'fiat' ? 'Select fiat currency' : 'Select crypto asset'}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {'flag' in option ? `${option.flag} ${option.value}` : `${option.icon} ${option.label}`}
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
