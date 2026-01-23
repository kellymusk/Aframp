"use client"

import { cn } from "@/lib/utils"

interface AmountInputProps {
  label: string
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  readOnly?: boolean
  autoFocus?: boolean
}

export function AmountInput({
  label,
  id,
  value,
  onChange,
  placeholder,
  error,
  readOnly,
  autoFocus,
}: AmountInputProps) {
  const inputId = id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-")

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        autoFocus={autoFocus}
        className={cn(
          "h-[52px] w-full rounded-xl border bg-background px-4 py-3 text-2xl font-semibold text-right shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500",
          readOnly ? "text-muted-foreground" : "text-foreground",
          (error || !value) ? "border-destructive" : "border-border"
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {/* <p
        id={`${inputId}-error`}
        role={error ? "alert" : undefined}
        className={cn("min-h-[16px] text-xs", error ? "text-destructive" : "text-transparent")}
      >
        {error || "."}
      </p> */}
    </div>
  )
}
