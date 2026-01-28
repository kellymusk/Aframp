"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/onramp/formatters"
import type { OfframpAssetOption } from "@/types/offramp"

interface AssetSelectorProps {
  options: OfframpAssetOption[]
  value: string
  onChange: (value: string) => void
}

export function AssetSelector({ options, value, onChange }: AssetSelectorProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => options.find((option) => option.id === value) || options[0], [options, value])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-[52px] w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            {selected.icon}
          </span>
          <div>
            <div className="text-sm font-semibold">{selected.label}</div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(selected.balance, 4)} available • {selected.chain}
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div
          className="absolute z-20 mt-2 w-full rounded-2xl border border-border bg-card shadow-lg"
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted",
                option.id === selected.id ? "bg-muted" : ""
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden>
                  {option.icon}
                </span>
                <div>
                  <div className="font-medium text-foreground">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.chain}</div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{formatNumber(option.balance, 4)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
