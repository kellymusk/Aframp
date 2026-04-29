'use client'

import { Check, CreditCard, Landmark, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PaymentMethod = 'card' | 'bank_transfer' | 'wallet'

interface PaymentMethodSelectorProps {
  selected: PaymentMethod
  onSelect: (method: PaymentMethod) => void
}

const methods = [
  {
    id: 'card',
    name: 'Card Payment',
    icon: CreditCard,
    description: 'Pay with Visa or Mastercard',
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: Landmark,
    description: 'Transfer from your bank app',
  },
  {
    id: 'wallet',
    name: 'Aframp Wallet',
    icon: Wallet,
    description: 'Use your Aframp balance',
  },
] as const

export function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Select Payment Method</label>
      <div className="grid gap-3">
        {methods.map((method) => {
          const isSelected = selected === method.id
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelect(method.id as PaymentMethod)}
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
      </div>
    </div>
  )
}
