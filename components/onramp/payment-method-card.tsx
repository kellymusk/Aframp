"use client"

import { cn } from "@/lib/utils"
import type { PaymentMethod } from "@/types/onramp"

interface PaymentMethodCardProps {
  value: PaymentMethod
  selected: boolean
  icon: string
  title: string
  description: string
  onSelect: (value: PaymentMethod) => void
}

export function PaymentMethodCard({
  value,
  selected,
  icon,
  title,
  description,
  onSelect,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/30",
        selected
          ? "border-primary/60 bg-primary/5 shadow-sm"
          : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl" aria-hidden>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  )
}
