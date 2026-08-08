'use client'

import { useEffect, useState } from 'react'
import { Check, CreditCard, Landmark, Wallet, Smartphone, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMobileMoneyOptions } from '@/lib/payments/regions'
import type { MobileMoneyOption } from '@/lib/payments/regions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentMethod = 'card' | 'bank_transfer' | 'wallet' | 'mpesa' | 'mtn_momo'

export interface MobileMoneyPaymentDetails {
  provider: 'mpesa' | 'mtn_momo'
  phoneNumber: string
}

interface PaymentMethodSelectorProps {
  selected: PaymentMethod
  onSelect: (method: PaymentMethod) => void
  /** ISO 3166-1 alpha-2 country code used to filter mobile money options */
  countryCode?: string
  /** Called whenever the mobile money phone number changes */
  onMobileMoneyDetails?: (details: MobileMoneyPaymentDetails | null) => void
}

// ---------------------------------------------------------------------------
// Static methods (always available)
// ---------------------------------------------------------------------------

const STATIC_METHODS = [
  {
    id: 'card' as const,
    name: 'Card Payment',
    icon: CreditCard,
    description: 'Pay with Visa or Mastercard',
  },
  {
    id: 'bank_transfer' as const,
    name: 'Bank Transfer',
    icon: Landmark,
    description: 'Transfer from your bank app',
  },
  {
    id: 'wallet' as const,
    name: 'Aframp Wallet',
    icon: Wallet,
    description: 'Use your Aframp balance',
  },
]

// ---------------------------------------------------------------------------
// E.164 validation helper
// ---------------------------------------------------------------------------

function validateE164(phone: string, pattern: string): boolean {
  try {
    return new RegExp(pattern).test(phone)
  } catch {
    return /^\+\d{7,15}$/.test(phone)
  }
}

// ---------------------------------------------------------------------------
// Phone input for mobile money
// ---------------------------------------------------------------------------

interface PhoneInputProps {
  option: MobileMoneyOption
  value: string
  onChange: (value: string) => void
  error: string | null
}

function PhoneInput({ option, value, onChange, error }: PhoneInputProps) {
  return (
    <div className="mt-3 space-y-1.5 px-1" onClick={(e) => e.stopPropagation()}>
      <Label htmlFor={`phone-${option.provider}`} className="text-xs font-medium text-foreground">
        Mobile number
      </Label>
      <Input
        id={`phone-${option.provider}`}
        type="tel"
        placeholder={`${option.dialPrefix} 7XX XXX XXX`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-10 rounded-xl bg-background text-sm',
          error ? 'border-destructive focus-visible:ring-destructive' : ''
        )}
        aria-describedby={error ? `phone-error-${option.provider}` : undefined}
      />
      {error && (
        <p
          id={`phone-error-${option.provider}`}
          className="text-xs text-destructive flex items-center gap-1"
        >
          <Info className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Enter your number in international format, e.g.{' '}
        <span className="font-mono">{option.dialPrefix}712345678</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PaymentMethodSelector({
  selected,
  onSelect,
  countryCode,
  onMobileMoneyDetails,
}: PaymentMethodSelectorProps) {
  const [phoneValues, setPhoneValues] = useState<Record<string, string>>({})
  const [phoneErrors, setPhoneErrors] = useState<Record<string, string | null>>({})

  // Derive available mobile money options from country
  const mobileMoneyOptions: MobileMoneyOption[] = countryCode
    ? getMobileMoneyOptions(countryCode)
    : []

  const hasMobileMoneySupport = mobileMoneyOptions.length > 0

  // When a mobile money method is selected, notify parent of phone details
  useEffect(() => {
    if (selected === 'mpesa' || selected === 'mtn_momo') {
      const option = mobileMoneyOptions.find((o) => o.provider === selected)
      if (!option) return

      const phone = phoneValues[selected] ?? ''
      const isValid = validateE164(phone, option.phonePattern)

      if (isValid) {
        onMobileMoneyDetails?.({ provider: selected, phoneNumber: phone })
      } else {
        onMobileMoneyDetails?.(null)
      }
    } else {
      onMobileMoneyDetails?.(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, phoneValues])

  // If the selected method is a mobile money option that's no longer available
  // (e.g. country changed), fall back to 'card'
  useEffect(() => {
    if (
      (selected === 'mpesa' || selected === 'mtn_momo') &&
      !mobileMoneyOptions.find((o) => o.provider === selected)
    ) {
      onSelect('card')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode])

  function handlePhoneChange(provider: string, value: string) {
    setPhoneValues((prev) => ({ ...prev, [provider]: value }))

    const option = mobileMoneyOptions.find((o) => o.provider === provider)
    if (!option) return

    if (value && !validateE164(value, option.phonePattern)) {
      setPhoneErrors((prev) => ({
        ...prev,
        [provider]: `Enter a valid ${option.dialPrefix} number in E.164 format`,
      }))
    } else {
      setPhoneErrors((prev) => ({ ...prev, [provider]: null }))
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Select Payment Method</label>
      <div className="grid gap-3">
        {/* ── Static methods ─────────────────────────────────────────────── */}
        {STATIC_METHODS.map((method) => {
          const isSelected = selected === method.id
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelect(method.id)}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 outline-none',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <method.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{method.name}</p>
                <p className="text-xs text-muted-foreground">{method.description}</p>
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          )
        })}

        {/* ── Mobile money methods ────────────────────────────────────────── */}
        {mobileMoneyOptions.map((option) => {
          const isSelected = selected === option.provider
          return (
            <button
              key={option.provider}
              type="button"
              onClick={() => onSelect(option.provider as PaymentMethod)}
              className={cn(
                'flex flex-col p-4 rounded-2xl border transition-all duration-200 outline-none text-left',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Phone input — only shown when this option is selected */}
              {isSelected && (
                <PhoneInput
                  option={option}
                  value={phoneValues[option.provider] ?? ''}
                  onChange={(val) => handlePhoneChange(option.provider, val)}
                  error={phoneErrors[option.provider] ?? null}
                />
              )}
            </button>
          )
        })}

        {/* ── Disabled placeholder when country has no mobile money support ─ */}
        {countryCode && !hasMobileMoneySupport && (
          <div
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/30 opacity-50 cursor-not-allowed"
            title="Not available in your region"
            aria-disabled="true"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted text-muted-foreground">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-muted-foreground">Mobile Money</p>
              <p className="text-xs text-muted-foreground">Not available in your region</p>
            </div>
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        )}
      </div>
    </div>
  )
}
