import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface NativeSelectProps extends Omit<React.ComponentProps<'select'>, 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  /** Shown while no option is chosen; the empty value is not selectable. */
  placeholder?: string
}

/**
 * A styled native `<select>`. Unlike the Radix `Select` it adds no JavaScript
 * of its own, which matters on routes under the bundle budget, and it gives
 * mobile browsers their native picker.
 */
function NativeSelect({
  className,
  value,
  onValueChange,
  placeholder,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        value={value}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        className={cn(
          'border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full appearance-none rounded-md border bg-transparent py-2 pr-9 pl-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
          value === '' && 'text-muted-foreground',
          className
        )}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-50"
      />
    </div>
  )
}

export { NativeSelect }
