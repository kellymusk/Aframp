'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { DateRangeFilter, PaymentFilters, StatusFilter } from '@/lib/payment-filters'

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

const DATE_CHIPS: { value: DateRangeFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
]

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'bg-pos text-ink border-transparent'
          : 'border-hairline text-dim hover:text-bright hover:bg-raised/60'
      )}
    >
      {children}
    </button>
  )
}

interface PaymentFiltersBarProps {
  filters: PaymentFilters
  onChange: (filters: PaymentFilters) => void
}

/** Search + status/date-range filter controls for the payments list, all client-side. */
export function PaymentFiltersBar({ filters, onChange }: PaymentFiltersBarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="text-dim pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by amount or reference…"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          className="bg-panel pl-9"
          aria-label="Search payments by amount or reference"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUS_CHIPS.map((chip) => (
          <Chip
            key={chip.value}
            active={filters.status === chip.value}
            onClick={() => onChange({ ...filters, status: chip.value })}
          >
            {chip.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by date range">
        {DATE_CHIPS.map((chip) => (
          <Chip
            key={chip.value}
            active={filters.dateRange === chip.value}
            onClick={() => onChange({ ...filters, dateRange: chip.value })}
          >
            {chip.label}
          </Chip>
        ))}
      </div>

      {filters.dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-dim text-xs" htmlFor="payment-filter-start">
            From
            <Input
              id="payment-filter-start"
              type="date"
              value={filters.customStart}
              onChange={(event) => onChange({ ...filters, customStart: event.target.value })}
              className="bg-panel mt-1 w-auto"
            />
          </label>
          <label className="text-dim text-xs" htmlFor="payment-filter-end">
            To
            <Input
              id="payment-filter-end"
              type="date"
              value={filters.customEnd}
              onChange={(event) => onChange({ ...filters, customEnd: event.target.value })}
              className="bg-panel mt-1 w-auto"
            />
          </label>
        </div>
      )}
    </div>
  )
}
